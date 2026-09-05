import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { calculatePayout } from "@/lib/payout";
import { db } from "@/server/db";
import {
    campaigns,
    submissionMetrics,
    submissions,
} from "@/server/db/schema";

export function todayUtc(): string {
    return new Date().toISOString().slice(0, 10);
}

export async function ingestOne(submissionId: string, day: string) {
    const [todayRow] = await db
        .select()
        .from(submissionMetrics)
        .where(
            and(
                eq(submissionMetrics.submissionId, submissionId),
                eq(submissionMetrics.capturedAt, day),
            ),
        )
        .limit(1);

    if (todayRow) {
        return { submissionId, status: "skipped" as const };
    }

    const [previous] = await db
        .select()
        .from(submissionMetrics)
        .where(eq(submissionMetrics.submissionId, submissionId))
        .orderBy(desc(submissionMetrics.capturedAt))
        .limit(1);

    const previousViews = previous?.views ?? 0;
    const previousLikes = previous?.likes ?? 0;
    const previousComments = previous?.comments ?? 0;

    const views =
        previousViews > 0
            ? previousViews + Math.floor(Math.random() * 2_500) + 100
            : 1_000 + Math.floor(Math.random() * 4_000);

    await db
        .insert(submissionMetrics)
        .values({
            id: nanoid(),
            submissionId,
            capturedAt: day,
            views,
            likes: previousLikes + Math.floor(Math.random() * 80),
            comments:
                previousComments + Math.floor(Math.random() * 20),
        })
        .onConflictDoNothing();

    return { submissionId, status: "inserted" as const, views };
}

export async function settleApprovedEarnings(submissionId: string) {
    return db.transaction(async (tx) => {
        const [submission] = await tx
            .select()
            .from(submissions)
            .where(eq(submissions.id, submissionId))
            .limit(1);

        if (!submission || submission.status !== "approved") {
            return { status: "skipped" as const, earningsCents: 0 };
        }

        const [campaign] = await tx
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, submission.campaignId))
            .limit(1);

        if (!campaign || campaign.status !== "active") {
            return {
                status: "unchanged" as const,
                earningsCents: submission.earningsCents ?? 0,
            };
        }

        const [latestMetric] = await tx
            .select()
            .from(submissionMetrics)
            .where(
                eq(submissionMetrics.submissionId, submission.id),
            )
            .orderBy(desc(submissionMetrics.capturedAt))
            .limit(1);

        const views = latestMetric?.views ?? 0;
        const target = calculatePayout(
            views,
            campaign.payoutPer1kViews,
        );
        const already = submission.earningsCents ?? 0;
        const remaining = Math.max(
            0,
            campaign.totalBudget - campaign.spentBudget,
        );
        const delta = Math.min(
            Math.max(0, target - already),
            remaining,
        );

        if (delta <= 0) {
            return {
                status: "unchanged" as const,
                earningsCents: already,
            };
        }

        const updated = await tx.execute<{ id: string }>(sql`
            UPDATE campaigns
            SET
                spent_budget = spent_budget + ${delta},
                status = CASE
                    WHEN spent_budget + ${delta} >= total_budget
                        THEN 'completed'::campaign_status
                    ELSE status
                END,
                updated_at = now()
            WHERE id = ${submission.campaignId}
                AND status = 'active'
                AND spent_budget + ${delta} <= total_budget
            RETURNING id
        `);

        if (updated.length === 0) {
            return {
                status: "budget_blocked" as const,
                earningsCents: already,
            };
        }

        const [finalSubmission] = await tx
            .update(submissions)
            .set({
                earningsCents: already + delta,
                updatedAt: new Date(),
            })
            .where(eq(submissions.id, submission.id))
            .returning();

        return {
            status: "settled" as const,
            earningsCents:
                finalSubmission?.earningsCents ?? already + delta,
            delta,
        };
    });
}

export async function runIngest(day = todayUtc()) {
    const rows = await db
        .select({
            id: submissions.id,
        })
        .from(submissions)
        .where(eq(submissions.status, "approved"));

    const failures: { submissionId: string; error: string }[] = [];
    let inserted = 0;
    let skipped = 0;
    let settled = 0;

    for (const row of rows) {
        try {
            const result = await ingestOne(row.id, day);
            if (result.status === "skipped") {
                skipped += 1;
            } else {
                inserted += 1;
            }

            const payout = await settleApprovedEarnings(row.id);
            if (payout.status === "settled") {
                settled += 1;
            }
        } catch (error) {
            failures.push({
                submissionId: row.id,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });
        }
    }

    return {
        day,
        targets: rows.length,
        inserted,
        skipped,
        settled,
        failures,
    };
}
