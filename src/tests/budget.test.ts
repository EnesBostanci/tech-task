import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import {
    adminUser,
    callerFor,
    creatorUser,
    db,
    resetDb,
    seedMinimal,
    submissionMetrics,
    submissions,
    campaigns,
} from "./helpers";

describe("budget and approvals", () => {
    beforeEach(async () => {
        await resetDb();
        await seedMinimal();

        await db.insert(submissions).values([
            {
                id: "sub-a",
                campaignId: "campaign-budget",
                creatorId: "creator-1",
                postUrl:
                    "https://www.tiktok.com/@a/video/1111111111",
                platform: "tiktok",
                status: "pending",
            },
            {
                id: "sub-b",
                campaignId: "campaign-budget",
                creatorId: "creator-2",
                postUrl:
                    "https://www.tiktok.com/@b/video/2222222222",
                platform: "tiktok",
                status: "pending",
            },
        ]);

        await db.insert(submissionMetrics).values([
            {
                id: "metric-a",
                submissionId: "sub-a",
                capturedAt: "2026-09-01",
                views: 5000,
                likes: 10,
                comments: 1,
            },
            {
                id: "metric-b",
                submissionId: "sub-b",
                capturedAt: "2026-09-01",
                views: 5000,
                likes: 10,
                comments: 1,
            },
        ]);
    });

    it("rejects approval that would exceed budget", async () => {
        // cost = 5000; leave only 4000 remaining
        await db
            .update(campaigns)
            .set({ spentBudget: 0, totalBudget: 4000 })
            .where(eq(campaigns.id, "campaign-budget"));

        const admin = await adminUser();
        const caller = callerFor(admin);

        await expect(
            caller.submission.approve({ submissionId: "sub-a" }),
        ).rejects.toMatchObject({
            cause: { appCode: "BUDGET_EXCEEDED" },
        });
    });

    it("allows only one of two concurrent approvals against shared budget", async () => {
        // each costs 5000; budget is 5000 → only one fits
        const admin = await adminUser();
        const caller = callerFor(admin);

        const results = await Promise.allSettled([
            caller.submission.approve({ submissionId: "sub-a" }),
            caller.submission.approve({ submissionId: "sub-b" }),
        ]);

        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);

        const [campaign] = await db
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, "campaign-budget"));

        expect(campaign.spentBudget).toBe(5000);
        expect(campaign.status).toBe("completed");
    });

    it("allows only one concurrent approval of the same submission", async () => {
        const admin = await adminUser();
        const caller = callerFor(admin);

        const results = await Promise.allSettled([
            caller.submission.approve({ submissionId: "sub-a" }),
            caller.submission.approve({ submissionId: "sub-a" }),
        ]);

        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);

        const failure = rejected[0];
        expect(failure?.status).toBe("rejected");
        if (failure?.status === "rejected") {
            expect(failure.reason).toMatchObject({
                cause: { appCode: "INVALID_STATUS" },
            });
        }

        const [submission] = await db
            .select()
            .from(submissions)
            .where(eq(submissions.id, "sub-a"));

        expect(submission.status).toBe("approved");
        expect(submission.earningsCents).toBe(5000);

        const [campaign] = await db
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, "campaign-budget"));

        expect(campaign.spentBudget).toBe(5000);
        expect(campaign.status).toBe("completed");
    });

    it("marks campaign completed when remaining budget hits zero", async () => {
        const admin = await adminUser();
        const caller = callerFor(admin);

        const approved = await caller.submission.approve({
            submissionId: "sub-a",
        });

        expect(approved.earningsCents).toBe(5000);

        const [campaign] = await db
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, "campaign-budget"));

        expect(campaign.spentBudget).toBe(5000);
        expect(campaign.status).toBe("completed");
    });

    it("does not credit earnings while a submission is still pending", async () => {
        const creator = await creatorUser();
        const mine = await callerFor(creator).submission.mine();
        const row = mine.find((item) => item.id === "sub-a");

        expect(row?.status).toBe("pending");
        expect(row?.currentViews).toBe(5000);
        expect(row?.estimatedEarnings).toBe(0);
    });
});


describe("campaign overview after approval", () => {
    beforeEach(async () => {
        await resetDb();
        await seedMinimal();

        await db.insert(submissions).values({
            id: "sub-overview",
            campaignId: "campaign-budget",
            creatorId: "creator-1",
            postUrl: "https://www.tiktok.com/@a/video/5555555555",
            platform: "tiktok",
            status: "pending",
        });

        await db.insert(submissionMetrics).values({
            id: "metric-overview",
            submissionId: "sub-overview",
            capturedAt: "2026-09-05",
            views: 5000,
            likes: 10,
            comments: 1,
        });
    });

    it("shows latest views and approve-time payout in the review queue", async () => {
        const admin = await adminUser();
        const pending = await callerFor(admin).submission.pendingByCampaign({
            campaignId: "campaign-budget",
        });

        expect(pending).toEqual([
            expect.objectContaining({
                id: "sub-overview",
                currentViews: 5000,
                estimatedPayout: 5000,
            }),
        ]);
    });

    it("moves approved views and budget onto the campaign counters", async () => {
        const admin = await adminUser();
        const caller = callerFor(admin);

        const before = await caller.campaign.overview("campaign-budget");
        expect(before?.totalApprovedViews).toBe(0);
        expect(before?.budgetSpent).toBe(0);
        expect(before?.budgetLeft).toBe(5000);

        await caller.submission.approve({ submissionId: "sub-overview" });

        const after = await caller.campaign.overview("campaign-budget");
        expect(after?.totalApprovedViews).toBe(5000);
        expect(after?.budgetSpent).toBe(5000);
        expect(after?.budgetLeft).toBe(0);
        expect(
            after?.dailyViews.find((row) => row.date === "2026-09-05")
                ?.views,
        ).toBe(5000);
    });
});

describe("access control", () => {
    beforeEach(async () => {
        await resetDb();
        await seedMinimal();

        await db.insert(submissions).values({
            id: "sub-owned",
            campaignId: "campaign-budget",
            creatorId: "creator-1",
            postUrl: "https://www.tiktok.com/@a/video/3333333333",
            platform: "tiktok",
            status: "pending",
        });
    });

    it("prevents a creator from reading another creator submission", async () => {
        const creator2 = await creatorUser("creator-2");
        const caller = callerFor(creator2);

        const row = await caller.submission.getByIdForCreator({
            id: "sub-owned",
        });
        expect(row).toBeNull();
    });

    it("blocks creators from admin campaign list", async () => {
        const creator = await creatorUser();
        const caller = callerFor(creator);

        await expect(
            caller.campaign.list({ page: 1, pageSize: 10 }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("blocks creators from approving submissions", async () => {
        const creator = await creatorUser();
        const caller = callerFor(creator);

        await expect(
            caller.submission.approve({ submissionId: "sub-owned" }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("blocks unauthenticated callers from approving submissions", async () => {
        const caller = callerFor(null);

        await expect(
            caller.submission.approve({ submissionId: "sub-owned" }),
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
});
