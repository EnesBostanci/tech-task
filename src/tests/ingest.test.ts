import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import {
    ingestOne,
    runIngest,
    settleApprovedEarnings,
} from "@/server/ingest";
import {
    callerFor,
    creatorUser,
    db,
    resetDb,
    seedMinimal,
    submissionMetrics,
    submissions,
    campaigns,
} from "./helpers";

describe("ingest", () => {
    beforeEach(async () => {
        await resetDb();
        await seedMinimal();

        await db.insert(submissions).values({
            id: "sub-approved",
            campaignId: "campaign-budget",
            creatorId: "creator-1",
            postUrl: "https://www.tiktok.com/@a/video/4444444444",
            platform: "tiktok",
            status: "approved",
        });
    });

    it("leaves data unchanged when run twice for the same day", async () => {
        const day = "2026-09-05";

        const first = await ingestOne("sub-approved", day);
        expect(first.status).toBe("inserted");

        const second = await ingestOne("sub-approved", day);
        expect(second.status).toBe("skipped");

        const rows = await db
            .select()
            .from(submissionMetrics)
            .where(eq(submissionMetrics.submissionId, "sub-approved"));

        expect(rows).toHaveLength(1);
    });

    it("does not double-credit when runIngest is repeated the same day", async () => {
        const day = "2026-09-05";

        const first = await runIngest(day);
        expect(first.failures).toEqual([]);
        expect(first.inserted).toBe(1);
        expect(first.skipped).toBe(0);
        expect(first.settled).toBe(1);

        const [afterFirst] = await db
            .select()
            .from(submissions)
            .where(eq(submissions.id, "sub-approved"));
        const [campaignAfterFirst] = await db
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, "campaign-budget"));

        expect(afterFirst.earningsCents).toBeGreaterThan(0);
        expect(campaignAfterFirst.spentBudget).toBe(afterFirst.earningsCents);

        const second = await runIngest(day);
        expect(second.failures).toEqual([]);
        expect(second.inserted).toBe(0);
        expect(second.skipped).toBe(1);

        const rows = await db
            .select()
            .from(submissionMetrics)
            .where(eq(submissionMetrics.submissionId, "sub-approved"));

        expect(rows).toHaveLength(1);

        const [afterSecond] = await db
            .select()
            .from(submissions)
            .where(eq(submissions.id, "sub-approved"));
        const [campaignAfterSecond] = await db
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, "campaign-budget"));

        expect(afterSecond.earningsCents).toBe(afterFirst.earningsCents);
        expect(campaignAfterSecond.spentBudget).toBe(
            campaignAfterFirst.spentBudget,
        );
    });

    it("credits earnings from latest views after ingest", async () => {
        await db.insert(submissionMetrics).values({
            id: "metric-approved",
            submissionId: "sub-approved",
            capturedAt: "2026-09-01",
            views: 2500,
            likes: 10,
            comments: 1,
        });

        const result = await settleApprovedEarnings("sub-approved");
        expect(result.status).toBe("settled");
        expect(result.earningsCents).toBe(2000);

        const creator = await creatorUser();
        const mine = await callerFor(creator).submission.mine();
        const row = mine.find((item) => item.id === "sub-approved");

        expect(row?.estimatedEarnings).toBe(2000);
        expect(row?.currentViews).toBe(2500);

        const [campaign] = await db
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, "campaign-budget"));

        expect(campaign.spentBudget).toBe(2000);
    });

    it("pays only the increment when views grow", async () => {
        await db
            .update(submissions)
            .set({ earningsCents: 2000 })
            .where(eq(submissions.id, "sub-approved"));

        await db
            .update(campaigns)
            .set({ spentBudget: 2000 })
            .where(eq(campaigns.id, "campaign-budget"));

        await db.insert(submissionMetrics).values({
            id: "metric-grown",
            submissionId: "sub-approved",
            capturedAt: "2026-09-05",
            views: 4500,
            likes: 20,
            comments: 2,
        });

        const result = await settleApprovedEarnings("sub-approved");
        expect(result.status).toBe("settled");
        expect(result.earningsCents).toBe(4000);

        const [campaign] = await db
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, "campaign-budget"));

        expect(campaign.spentBudget).toBe(4000);
        expect(campaign.status).toBe("active");
    });

    it("caps later payouts at remaining campaign budget", async () => {
        await db.insert(submissionMetrics).values({
            id: "metric-over",
            submissionId: "sub-approved",
            capturedAt: "2026-09-05",
            views: 20_000,
            likes: 50,
            comments: 5,
        });

        const result = await settleApprovedEarnings("sub-approved");
        expect(result.status).toBe("settled");
        expect(result.earningsCents).toBe(5000);

        const [campaign] = await db
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, "campaign-budget"));

        expect(campaign.spentBudget).toBe(5000);
        expect(campaign.status).toBe("completed");
    });

    it("does not write metrics for pending submissions", async () => {
        await db.insert(submissions).values({
            id: "sub-pending",
            campaignId: "campaign-budget",
            creatorId: "creator-2",
            postUrl: "https://www.tiktok.com/@b/video/5555555555",
            platform: "tiktok",
            status: "pending",
        });

        const result = await runIngest("2026-09-05");

        expect(result.targets).toBe(1);
        expect(result.failures).toEqual([]);

        const pendingRows = await db
            .select()
            .from(submissionMetrics)
            .where(eq(submissionMetrics.submissionId, "sub-pending"));

        expect(pendingRows).toHaveLength(0);
    });
});
