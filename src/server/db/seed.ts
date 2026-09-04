import "dotenv/config";

import { db } from "./index";
import {
    campaigns,
    submissionMetrics,
    submissions,
    users,
} from "./schema";

async function seed() {
    console.log("🌱 Starting seed...");

    // =========================================================
    // 1. USERS
    // =========================================================

    await db
        .insert(users)
        .values([
            // ADMINS
            {
                id: "admin-1",
                email: "admin1@example.com",
                role: "admin",
            },
            {
                id: "admin-2",
                email: "admin2@example.com",
                role: "admin",
            },

            // CREATORS
            {
                id: "creator-1",
                email: "creator1@example.com",
                role: "creator",
            },
            {
                id: "creator-2",
                email: "creator2@example.com",
                role: "creator",
            },
            {
                id: "creator-3",
                email: "creator3@example.com",
                role: "creator",
            },
        ])
        .onConflictDoNothing();

    console.log("✅ Users seeded");

    // =========================================================
    // 2. CAMPAIGNS
    // =========================================================

    await db
        .insert(campaigns)
        .values([
            {
                id: "campaign-1",
                title: "Summer Fashion Campaign",
                platforms: ["tiktok", "instagram"],
                payoutPer1kViews: 500,
                totalBudget: 100000,
                spentBudget: 25000,
                status: "active",
                startsAt: new Date("2026-09-01"),
                endsAt: new Date("2026-09-30"),
            },

            {
                id: "campaign-2",
                title: "Gaming Creator Challenge",
                platforms: ["youtube", "tiktok"],
                payoutPer1kViews: 750,
                totalBudget: 150000,
                spentBudget: 45000,
                status: "active",
                startsAt: new Date("2026-09-01"),
                endsAt: new Date("2026-10-01"),
            },

            {
                id: "campaign-3",
                title: "Autumn Beauty Clips",
                platforms: ["instagram", "tiktok"],
                payoutPer1kViews: 600,
                totalBudget: 80000,
                spentBudget: 12000,
                status: "active",
                startsAt: new Date("2026-09-05"),
                endsAt: new Date("2026-10-05"),
            },

            {
                id: "campaign-4",
                title: "Tech Product Launch",
                platforms: ["youtube", "instagram"],
                payoutPer1kViews: 1000,
                totalBudget: 200000,
                spentBudget: 75000,
                status: "active",
                startsAt: new Date("2026-09-10"),
                endsAt: new Date("2026-10-10"),
            },

            {
                id: "campaign-5",
                title: "Streetwear TikTok Challenge",
                platforms: ["tiktok"],
                payoutPer1kViews: 400,
                totalBudget: 50000,
                spentBudget: 0,
                status: "draft",
                startsAt: new Date("2026-10-01"),
                endsAt: new Date("2026-10-31"),
            },

            {
                id: "campaign-6",
                title: "Healthy Lifestyle Campaign",
                platforms: ["instagram", "youtube"],
                payoutPer1kViews: 850,
                totalBudget: 120000,
                spentBudget: 30000,
                status: "paused",
                startsAt: new Date("2026-08-15"),
                endsAt: new Date("2026-09-20"),
            },

            {
                id: "campaign-7",
                title: "Winter Gaming Festival",
                platforms: ["youtube", "tiktok"],
                payoutPer1kViews: 900,
                totalBudget: 300000,
                spentBudget: 300000,
                status: "completed",
                startsAt: new Date("2026-07-01"),
                endsAt: new Date("2026-08-01"),
            },

            {
                id: "campaign-8",
                title: "Travel & Adventure Reels",
                platforms: ["instagram", "tiktok"],
                payoutPer1kViews: 550,
                totalBudget: 90000,
                spentBudget: 18000,
                status: "active",
                startsAt: new Date("2026-09-01"),
                endsAt: new Date("2026-09-25"),
            },
        ])
        .onConflictDoNothing();

    console.log("✅ 8 campaigns seeded");

    // =========================================================
    // 3. SUBMISSIONS
    // =========================================================

    await db
        .insert(submissions)
        .values([
            // =====================================================
            // CREATOR 1
            // =====================================================

            {
                id: "submission-1",
                campaignId: "campaign-1",
                creatorId: "creator-1",
                postUrl:
                    "https://www.tiktok.com/@creator1/video/100001",
                platform: "tiktok",
                status: "approved",
            },

            {
                id: "submission-2",
                campaignId: "campaign-2",
                creatorId: "creator-1",
                postUrl:
                    "https://www.youtube.com/watch?v=creator1gaming",
                platform: "youtube",
                status: "approved",
            },

            {
                id: "submission-3",
                campaignId: "campaign-3",
                creatorId: "creator-1",
                postUrl:
                    "https://www.instagram.com/reel/creator1beauty",
                platform: "instagram",
                status: "pending",
            },

            {
                id: "submission-4",
                campaignId: "campaign-4",
                creatorId: "creator-1",
                postUrl:
                    "https://www.youtube.com/watch?v=creator1tech",
                platform: "youtube",
                status: "rejected",
                rejectionReason:
                    "The video does not meet the campaign requirements.",
            },

            // =====================================================
            // CREATOR 2
            // =====================================================

            {
                id: "submission-5",
                campaignId: "campaign-1",
                creatorId: "creator-2",
                postUrl:
                    "https://www.instagram.com/reel/creator2fashion",
                platform: "instagram",
                status: "approved",
            },

            {
                id: "submission-6",
                campaignId: "campaign-2",
                creatorId: "creator-2",
                postUrl:
                    "https://www.tiktok.com/@creator2/video/200001",
                platform: "tiktok",
                status: "approved",
            },

            {
                id: "submission-7",
                campaignId: "campaign-4",
                creatorId: "creator-2",
                postUrl:
                    "https://www.instagram.com/reel/creator2tech",
                platform: "instagram",
                status: "pending",
            },

            {
                id: "submission-8",
                campaignId: "campaign-6",
                creatorId: "creator-2",
                postUrl:
                    "https://www.youtube.com/watch?v=creator2health",
                platform: "youtube",
                status: "approved",
            },

            // =====================================================
            // CREATOR 3
            // =====================================================

            {
                id: "submission-9",
                campaignId: "campaign-1",
                creatorId: "creator-3",
                postUrl:
                    "https://www.tiktok.com/@creator3/video/300001",
                platform: "tiktok",
                status: "pending",
            },

            {
                id: "submission-10",
                campaignId: "campaign-2",
                creatorId: "creator-3",
                postUrl:
                    "https://www.youtube.com/watch?v=creator3gaming",
                platform: "youtube",
                status: "approved",
            },

            {
                id: "submission-11",
                campaignId: "campaign-3",
                creatorId: "creator-3",
                postUrl:
                    "https://www.instagram.com/reel/creator3beauty",
                platform: "instagram",
                status: "approved",
            },

            {
                id: "submission-12",
                campaignId: "campaign-8",
                creatorId: "creator-3",
                postUrl:
                    "https://www.instagram.com/reel/creator3travel",
                platform: "instagram",
                status: "pending",
            },
        ])
        .onConflictDoNothing();

    console.log("✅ 12 submissions seeded");

    // =========================================================
    // 4. METRICS
    // =========================================================

    await db
        .insert(submissionMetrics)
        .values([
            // Submission 1
            {
                id: "metric-1",
                submissionId: "submission-1",
                capturedAt: "2026-09-01",
                views: 12000,
                likes: 850,
                comments: 120,
            },
            {
                id: "metric-2",
                submissionId: "submission-1",
                capturedAt: "2026-09-02",
                views: 18500,
                likes: 1200,
                comments: 175,
            },
            {
                id: "metric-3",
                submissionId: "submission-1",
                capturedAt: "2026-09-03",
                views: 24000,
                likes: 1600,
                comments: 220,
            },

            // Submission 2
            {
                id: "metric-4",
                submissionId: "submission-2",
                capturedAt: "2026-09-01",
                views: 30000,
                likes: 2100,
                comments: 310,
            },
            {
                id: "metric-5",
                submissionId: "submission-2",
                capturedAt: "2026-09-02",
                views: 42000,
                likes: 2900,
                comments: 410,
            },

            // Submission 5
            {
                id: "metric-6",
                submissionId: "submission-5",
                capturedAt: "2026-09-02",
                views: 15000,
                likes: 1100,
                comments: 180,
            },
            {
                id: "metric-7",
                submissionId: "submission-5",
                capturedAt: "2026-09-03",
                views: 22000,
                likes: 1600,
                comments: 240,
            },

            // Submission 6
            {
                id: "metric-8",
                submissionId: "submission-6",
                capturedAt: "2026-09-01",
                views: 8000,
                likes: 600,
                comments: 80,
            },
            {
                id: "metric-9",
                submissionId: "submission-6",
                capturedAt: "2026-09-03",
                views: 17000,
                likes: 1300,
                comments: 150,
            },

            // Submission 8
            {
                id: "metric-10",
                submissionId: "submission-8",
                capturedAt: "2026-09-01",
                views: 10000,
                likes: 700,
                comments: 100,
            },
            {
                id: "metric-11",
                submissionId: "submission-8",
                capturedAt: "2026-09-03",
                views: 35000,
                likes: 2400,
                comments: 300,
            },

            // Submission 10
            {
                id: "metric-12",
                submissionId: "submission-10",
                capturedAt: "2026-09-02",
                views: 25000,
                likes: 1800,
                comments: 200,
            },

            // Submission 11
            {
                id: "metric-13",
                submissionId: "submission-11",
                capturedAt: "2026-09-01",
                views: 11000,
                likes: 900,
                comments: 130,
            },
            {
                id: "metric-14",
                submissionId: "submission-11",
                capturedAt: "2026-09-03",
                views: 19500,
                likes: 1500,
                comments: 210,
            },
        ])
        .onConflictDoNothing();

    console.log("✅ Metrics seeded");

    console.log("🎉 Seed complete!");

    process.exit(0);
}

seed().catch((error) => {
    console.error("❌ Seed failed:", error);

    process.exit(1);
});