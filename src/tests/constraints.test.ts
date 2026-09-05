import { beforeEach, describe, expect, it } from "vitest";

import {
    callerFor,
    campaigns,
    creatorUser,
    db,
    resetDb,
    seedMinimal,
    submissionMetrics,
    submissions,
} from "./helpers";

function pgError(error: unknown): {
    code?: string;
    constraint_name?: string;
} {
    if (!error || typeof error !== "object") {
        return {};
    }

    const direct = error as {
        code?: string;
        constraint_name?: string;
        cause?: unknown;
    };

    if (direct.code) {
        return {
            code: direct.code,
            constraint_name: direct.constraint_name,
        };
    }

    if (direct.cause && typeof direct.cause === "object") {
        const cause = direct.cause as {
            code?: string;
            constraint_name?: string;
        };
        return {
            code: cause.code,
            constraint_name: cause.constraint_name,
        };
    }

    return {};
}

describe("database constraints", () => {
    beforeEach(async () => {
        await resetDb();
        await seedMinimal();

        await db.insert(submissions).values([
            {
                id: "sub-a",
                campaignId: "campaign-budget",
                creatorId: "creator-1",
                postUrl: "https://www.tiktok.com/@a/video/1111111111",
                platform: "tiktok",
                status: "pending",
            },
            {
                id: "sub-b",
                campaignId: "campaign-budget",
                creatorId: "creator-2",
                postUrl: "https://www.tiktok.com/@b/video/2222222222",
                platform: "tiktok",
                status: "pending",
            },
        ]);
    });

    it("rejects a second metric for the same submission on the same day", async () => {
        await db.insert(submissionMetrics).values({
            id: "metric-a-day",
            submissionId: "sub-a",
            capturedAt: "2026-09-05",
            views: 1000,
            likes: 1,
            comments: 0,
        });

        try {
            await db.insert(submissionMetrics).values({
                id: "metric-a-day-dup",
                submissionId: "sub-a",
                capturedAt: "2026-09-05",
                views: 2000,
                likes: 2,
                comments: 0,
            });
            expect.fail("expected unique violation");
        } catch (error) {
            expect(pgError(error)).toMatchObject({
                code: "23505",
                constraint_name: "submission_metric_date_unique",
            });
        }
    });

    it("allows a second metric for the same submission on a different day", async () => {
        await db.insert(submissionMetrics).values([
            {
                id: "metric-a-d1",
                submissionId: "sub-a",
                capturedAt: "2026-09-05",
                views: 1000,
                likes: 1,
                comments: 0,
            },
            {
                id: "metric-a-d2",
                submissionId: "sub-a",
                capturedAt: "2026-09-06",
                views: 1500,
                likes: 2,
                comments: 0,
            },
        ]);

        const rows = await db.select().from(submissionMetrics);
        expect(rows).toHaveLength(2);
    });

    it("allows two submissions in the same campaign to have metrics on the same day", async () => {
        await db.insert(submissionMetrics).values([
            {
                id: "metric-a-same-day",
                submissionId: "sub-a",
                capturedAt: "2026-09-05",
                views: 1000,
                likes: 1,
                comments: 0,
            },
            {
                id: "metric-b-same-day",
                submissionId: "sub-b",
                capturedAt: "2026-09-05",
                views: 1200,
                likes: 2,
                comments: 0,
            },
        ]);

        const rows = await db.select().from(submissionMetrics);
        expect(rows).toHaveLength(2);
    });

    it("rejects an orphan metric with no submission", async () => {
        try {
            await db.insert(submissionMetrics).values({
                id: "metric-orphan",
                submissionId: "does-not-exist",
                capturedAt: "2026-09-05",
                views: 1000,
                likes: 0,
                comments: 0,
            });
            expect.fail("expected foreign key violation");
        } catch (error) {
            expect(pgError(error)).toMatchObject({
                code: "23503",
            });
        }
    });

    it("rejects the same post URL twice on one campaign", async () => {
        const creator = await creatorUser();
        const caller = callerFor(creator);
        const postUrl = "https://www.tiktok.com/@dup/video/5555555555";

        await caller.submission.create({
            campaignId: "campaign-budget",
            platform: "tiktok",
            postUrl,
        });

        await expect(
            caller.submission.create({
                campaignId: "campaign-budget",
                platform: "tiktok",
                postUrl,
            }),
        ).rejects.toMatchObject({
            cause: { appCode: "DUPLICATE_URL" },
        });
    });

    it("allows the same post URL on a different campaign", async () => {
        await db.insert(campaigns).values({
            id: "campaign-other",
            title: "Other campaign",
            platforms: ["tiktok"],
            payoutPer1kViews: 1000,
            totalBudget: 8000,
            spentBudget: 0,
            status: "active",
            startsAt: new Date("2026-09-01"),
            endsAt: new Date("2026-09-30"),
        });

        const creator = await creatorUser();
        const caller = callerFor(creator);
        const postUrl = "https://www.tiktok.com/@shared/video/6666666666";

        await caller.submission.create({
            campaignId: "campaign-budget",
            platform: "tiktok",
            postUrl,
        });

        const other = await caller.submission.create({
            campaignId: "campaign-other",
            platform: "tiktok",
            postUrl,
        });

        expect(other.campaignId).toBe("campaign-other");
        expect(other.postUrl).toBe(postUrl);
    });
});
