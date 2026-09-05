import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { ERROR_CODES, isUniqueViolation } from "@/lib/errors";
import { calculatePayout } from "@/lib/payout";
import {
    approveSubmissionSchema,
    rejectSubmissionSchema,
    submissionCreateSchema,
} from "@/lib/schemas";
import {
    campaigns,
    submissionMetrics,
    submissions,
} from "@/server/db/schema";
import {
    adminProcedure,
    appError,
    creatorProcedure,
    router,
} from "@/server/trpc";
import { TRPCError } from "@trpc/server";

export const submissionRouter = router({
    create: creatorProcedure
        .input(submissionCreateSchema)
        .mutation(async ({ ctx, input }) => {
            const [campaign] = await ctx.db
                .select()
                .from(campaigns)
                .where(eq(campaigns.id, input.campaignId))
                .limit(1);

            if (!campaign || campaign.status !== "active") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Campaign is not accepting submissions",
                });
            }

            if (!campaign.platforms.includes(input.platform)) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message:
                        "Platform is not allowed for this campaign",
                });
            }

            try {
                const [created] = await ctx.db
                    .insert(submissions)
                    .values({
                        id: nanoid(),
                        campaignId: input.campaignId,
                        creatorId: ctx.user.id,
                        postUrl: input.postUrl,
                        platform: input.platform,
                        status: "pending",
                    })
                    .returning();

                return created;
            } catch (error) {
                if (
                    isUniqueViolation(
                        error,
                        "campaign_post_url_unique",
                    )
                ) {
                    throw appError(
                        "CONFLICT",
                        "This URL was already submitted to this campaign",
                        ERROR_CODES.DUPLICATE_URL,
                    );
                }

                throw error;
            }
        }),

    mine: creatorProcedure.query(async ({ ctx }) => {
        const rows = await ctx.db
            .select({
                submission: submissions,
                campaignTitle: campaigns.title,
                latestViews: sql<number | null>`(
                    SELECT sm.views
                    FROM submission_metrics sm
                    WHERE sm.submission_id = ${submissions.id}
                    ORDER BY sm.captured_at DESC
                    LIMIT 1
                )`,
            })
            .from(submissions)
            .innerJoin(
                campaigns,
                eq(submissions.campaignId, campaigns.id),
            )
            .where(eq(submissions.creatorId, ctx.user.id))
            .orderBy(desc(submissions.createdAt));

        return rows.map((row) => {
            const settled =
                row.submission.status === "approved" ||
                row.submission.status === "paid";

            return {
                ...row.submission,
                campaignTitle: row.campaignTitle,
                currentViews: row.latestViews ?? 0,
                estimatedEarnings: settled
                    ? (row.submission.earningsCents ?? 0)
                    : 0,
            };
        });
    }),

    pendingByCampaign: adminProcedure
        .input(z.object({ campaignId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            const rows = await ctx.db
                .select({
                    submission: submissions,
                    payoutPer1kViews: campaigns.payoutPer1kViews,
                    latestViews: sql<number | null>`(
                        SELECT sm.views
                        FROM submission_metrics sm
                        WHERE sm.submission_id = ${submissions.id}
                        ORDER BY sm.captured_at DESC
                        LIMIT 1
                    )`,
                })
                .from(submissions)
                .innerJoin(
                    campaigns,
                    eq(submissions.campaignId, campaigns.id),
                )
                .where(
                    and(
                        eq(submissions.campaignId, input.campaignId),
                        eq(submissions.status, "pending"),
                    ),
                )
                .orderBy(desc(submissions.createdAt));

            return rows.map((row) => {
                const currentViews = row.latestViews ?? 0;

                return {
                    ...row.submission,
                    currentViews,
                    estimatedPayout: calculatePayout(
                        currentViews,
                        row.payoutPer1kViews,
                    ),
                };
            });
        }),

    getByIdForCreator: creatorProcedure
        .input(z.object({ id: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            const [row] = await ctx.db
                .select()
                .from(submissions)
                .where(
                    and(
                        eq(submissions.id, input.id),
                        eq(submissions.creatorId, ctx.user.id),
                    ),
                )
                .limit(1);

            return row ?? null;
        }),

    approve: adminProcedure
        .input(approveSubmissionSchema)
        .mutation(async ({ ctx, input }) => {
            return ctx.db.transaction(async (tx) => {
                const [claimed] = await tx
                    .update(submissions)
                    .set({
                        status: "approved",
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(submissions.id, input.submissionId),
                            eq(submissions.status, "pending"),
                        ),
                    )
                    .returning();

                if (!claimed) {
                    throw appError(
                        "BAD_REQUEST",
                        "Submission is not pending",
                        ERROR_CODES.INVALID_STATUS,
                    );
                }

                const [campaign] = await tx
                    .select()
                    .from(campaigns)
                    .where(eq(campaigns.id, claimed.campaignId))
                    .limit(1);

                if (!campaign) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Campaign not found",
                    });
                }

                const [latestMetric] = await tx
                    .select()
                    .from(submissionMetrics)
                    .where(
                        eq(
                            submissionMetrics.submissionId,
                            claimed.id,
                        ),
                    )
                    .orderBy(desc(submissionMetrics.capturedAt))
                    .limit(1);

                const views = latestMetric?.views ?? 0;
                const cost = calculatePayout(
                    views,
                    campaign.payoutPer1kViews,
                );

                const updated = await tx.execute<{ id: string }>(sql`
                    UPDATE campaigns
                    SET
                        spent_budget = spent_budget + ${cost},
                        status = CASE
                            WHEN spent_budget + ${cost} >= total_budget
                                THEN 'completed'::campaign_status
                            ELSE status
                        END,
                        updated_at = now()
                    WHERE id = ${claimed.campaignId}
                        AND status = 'active'
                        AND spent_budget + ${cost} <= total_budget
                    RETURNING id
                `);

                if (updated.length === 0) {
                    throw appError(
                        "CONFLICT",
                        "Approving this submission would exceed the campaign budget",
                        ERROR_CODES.BUDGET_EXCEEDED,
                    );
                }

                const [finalSubmission] = await tx
                    .update(submissions)
                    .set({
                        earningsCents: cost,
                        updatedAt: new Date(),
                    })
                    .where(eq(submissions.id, claimed.id))
                    .returning();

                return finalSubmission;
            });
        }),

    reject: adminProcedure
        .input(rejectSubmissionSchema)
        .mutation(async ({ ctx, input }) => {
            const [updated] = await ctx.db
                .update(submissions)
                .set({
                    status: "rejected",
                    rejectionReason: input.reason,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(submissions.id, input.submissionId),
                        eq(submissions.status, "pending"),
                    ),
                )
                .returning();

            if (!updated) {
                throw appError(
                    "BAD_REQUEST",
                    "Submission is not pending",
                    ERROR_CODES.INVALID_STATUS,
                );
            }

            return updated;
        }),
});
