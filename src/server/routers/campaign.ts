import {
    and,
    count,
    desc,
    eq,
    ilike,
    sql,
} from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import {
    campaignFormSchema,
    campaignListInputSchema,
    campaignUpdateSchema,
} from "@/lib/schemas";
import { campaigns, submissionMetrics, submissions } from "@/server/db/schema";
import { adminProcedure, creatorProcedure, router } from "@/server/trpc";

function metricDayKey(value: Date | string): string {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
}

function eachDateInclusive(start: Date, end: Date): string[] {
    const dates: string[] = [];
    const cursor = new Date(
        Date.UTC(
            start.getUTCFullYear(),
            start.getUTCMonth(),
            start.getUTCDate(),
        ),
    );
    const last = new Date(
        Date.UTC(
            end.getUTCFullYear(),
            end.getUTCMonth(),
            end.getUTCDate(),
        ),
    );

    while (cursor <= last) {
        dates.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return dates;
}

export const campaignRouter = router({
    list: adminProcedure
        .input(campaignListInputSchema)
        .query(async ({ ctx, input }) => {
            const conditions = [];

            if (input.status) {
                conditions.push(eq(campaigns.status, input.status));
            }

            if (input.search) {
                conditions.push(
                    ilike(campaigns.title, `%${input.search}%`),
                );
            }

            const where =
                conditions.length > 0
                    ? and(...conditions)
                    : undefined;

            const offset = (input.page - 1) * input.pageSize;

            const [items, totalRow] = await Promise.all([
                ctx.db
                    .select()
                    .from(campaigns)
                    .where(where)
                    .orderBy(desc(campaigns.createdAt))
                    .limit(input.pageSize)
                    .offset(offset),
                ctx.db
                    .select({ value: count() })
                    .from(campaigns)
                    .where(where),
            ]);

            const total = totalRow[0]?.value ?? 0;

            return {
                items,
                total,
                page: input.page,
                pageSize: input.pageSize,
                pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
            };
        }),

    byId: adminProcedure
        .input(z.string().min(1))
        .query(async ({ ctx, input }) => {
            const [campaign] = await ctx.db
                .select()
                .from(campaigns)
                .where(eq(campaigns.id, input))
                .limit(1);

            return campaign ?? null;
        }),

    create: adminProcedure
        .input(campaignFormSchema)
        .mutation(async ({ ctx, input }) => {
            const id = nanoid();
            const now = new Date();

            const [created] = await ctx.db
                .insert(campaigns)
                .values({
                    id,
                    title: input.title,
                    platforms: input.platforms,
                    payoutPer1kViews: input.payoutPer1kViews,
                    totalBudget: input.totalBudget,
                    spentBudget: 0,
                    status: input.status,
                    startsAt: input.startsAt,
                    endsAt: input.endsAt,
                    createdAt: now,
                    updatedAt: now,
                })
                .returning();

            return created;
        }),

    update: adminProcedure
        .input(campaignUpdateSchema)
        .mutation(async ({ ctx, input }) => {
            const [updated] = await ctx.db
                .update(campaigns)
                .set({
                    title: input.data.title,
                    platforms: input.data.platforms,
                    payoutPer1kViews: input.data.payoutPer1kViews,
                    totalBudget: input.data.totalBudget,
                    status: input.data.status,
                    startsAt: input.data.startsAt,
                    endsAt: input.data.endsAt,
                    updatedAt: new Date(),
                })
                .where(eq(campaigns.id, input.id))
                .returning();

            return updated ?? null;
        }),

    listActive: creatorProcedure.query(async ({ ctx }) => {
        return ctx.db
            .select()
            .from(campaigns)
            .where(eq(campaigns.status, "active"))
            .orderBy(desc(campaigns.createdAt));
    }),

    overview: adminProcedure
        .input(z.string().min(1))
        .query(async ({ ctx, input }) => {
            const [campaign] = await ctx.db
                .select()
                .from(campaigns)
                .where(eq(campaigns.id, input))
                .limit(1);

            if (!campaign) {
                return null;
            }

            const approved = await ctx.db
                .select({ id: submissions.id })
                .from(submissions)
                .where(
                    and(
                        eq(submissions.campaignId, input),
                        eq(submissions.status, "approved"),
                    ),
                );

            const approvedIds = approved.map((s) => s.id);

            let totalApprovedViews = 0;

            if (approvedIds.length > 0) {
                const latestViews = await ctx.db.execute<{
                    views: number;
                }>(sql`
                    SELECT COALESCE(SUM(latest.views), 0)::int AS views
                    FROM (
                        SELECT DISTINCT ON (submission_id) views
                        FROM submission_metrics
                        WHERE submission_id IN (${sql.join(
                            approvedIds.map((id) => sql`${id}`),
                            sql`, `,
                        )})
                        ORDER BY submission_id, captured_at DESC
                    ) AS latest
                `);

                totalApprovedViews = Number(
                    latestViews[0]?.views ?? 0,
                );
            }

            const dailyRows = await ctx.db
                .select({
                    day: submissionMetrics.capturedAt,
                    views: sql<number>`sum(${submissionMetrics.views})::int`,
                })
                .from(submissionMetrics)
                .innerJoin(
                    submissions,
                    eq(
                        submissionMetrics.submissionId,
                        submissions.id,
                    ),
                )
                .where(
                    and(
                        eq(submissions.campaignId, input),
                        eq(submissions.status, "approved"),
                    ),
                )
                .groupBy(submissionMetrics.capturedAt);

            const byDay = new Map(
                dailyRows.map((row) => [
                    metricDayKey(row.day),
                    Number(row.views),
                ]),
            );

            const dailyViews = eachDateInclusive(
                campaign.startsAt,
                campaign.endsAt,
            ).map((date) => ({
                date,
                views: byDay.get(date) ?? 0,
            }));

            return {
                campaign,
                totalApprovedViews,
                budgetSpent: campaign.spentBudget,
                budgetLeft: Math.max(
                    0,
                    campaign.totalBudget - campaign.spentBudget,
                ),
                dailyViews,
            };
        }),
});
