import "dotenv/config";

import { sql } from "drizzle-orm";

import { calculatePayout } from "@/lib/payout";
import { db } from "./index";
import {
    campaigns,
    submissionMetrics,
    submissions,
    users,
} from "./schema";

type Platform = "tiktok" | "instagram" | "youtube";
type SubmissionStatus = "pending" | "approved" | "rejected" | "paid";

const CREATORS = ["creator-1", "creator-2", "creator-3"] as const;

const STATUSES: SubmissionStatus[] = [
    "approved",
    "pending",
    "rejected",
];

const APPROVED_SEED_VIEWS = 8_000;
const PENDING_SEED_VIEWS = 5_000;
const SEED_METRIC_DAY = "2026-09-05";

/** Approved rows with no views would show $0 on the overview — keep those pending. */
function statusForSeed(
    status: SubmissionStatus,
    views: number,
): SubmissionStatus {
    if (status === "approved" && views === 0) {
        return "pending";
    }
    return status;
}

function viewsForSeedStatus(status: SubmissionStatus): number {
    if (status === "approved") {
        return APPROVED_SEED_VIEWS;
    }

    if (status === "pending") {
        return PENDING_SEED_VIEWS;
    }

    return 0;
}

/** Dedicated fixtures for BUDGET_EXCEEDED UI testing — not auto-submitted. */
const BUDGET_CEILING_CAMPAIGN_ID = "campaign-budget-ceiling";
const ONE_APPROVE_CAMPAIGN_ID = "campaign-9";
const COMPLETED_CAMPAIGN_ID = "campaign-7";
const MANUAL_BUDGET_CAMPAIGN_IDS = new Set([
    BUDGET_CEILING_CAMPAIGN_ID,
    ONE_APPROVE_CAMPAIGN_ID,
]);
const COMPLETED_VIEWS_PER_CREATOR = 100_000;
const COMPLETED_PAYOUT_PER_1K = 900;
const COMPLETED_EARNINGS = calculatePayout(
    COMPLETED_VIEWS_PER_CREATOR,
    COMPLETED_PAYOUT_PER_1K,
);
const COMPLETED_BUDGET =
    COMPLETED_EARNINGS * CREATORS.length;

const campaignSeed = [
    {
        id: "campaign-1",
        title: "Summer Fashion Campaign",
        platforms: ["tiktok", "instagram"] as Platform[],
        payoutPer1kViews: 500,
        totalBudget: 100000,
        spentBudget: 0,
        status: "active" as const,
        startsAt: new Date("2026-09-01"),
        endsAt: new Date("2026-09-30"),
    },
    {
        id: "campaign-2",
        title: "Gaming Creator Challenge",
        platforms: ["youtube", "tiktok"] as Platform[],
        payoutPer1kViews: 750,
        totalBudget: 150000,
        spentBudget: 0,
        status: "active" as const,
        startsAt: new Date("2026-09-01"),
        endsAt: new Date("2026-10-01"),
    },
    {
        id: "campaign-3",
        title: "Autumn Beauty Clips",
        platforms: ["instagram", "tiktok"] as Platform[],
        payoutPer1kViews: 600,
        totalBudget: 80000,
        spentBudget: 0,
        status: "active" as const,
        startsAt: new Date("2026-09-05"),
        endsAt: new Date("2026-10-05"),
    },
    {
        id: "campaign-4",
        title: "Tech Product Launch",
        platforms: ["youtube", "instagram"] as Platform[],
        payoutPer1kViews: 1000,
        totalBudget: 200000,
        spentBudget: 0,
        status: "active" as const,
        startsAt: new Date("2026-09-01"),
        endsAt: new Date("2026-10-10"),
    },
    {
        id: "campaign-5",
        title: "Streetwear TikTok Challenge",
        platforms: ["tiktok"] as Platform[],
        payoutPer1kViews: 400,
        totalBudget: 50000,
        spentBudget: 0,
        status: "draft" as const,
        startsAt: new Date("2026-10-01"),
        endsAt: new Date("2026-10-31"),
    },
    {
        id: "campaign-6",
        title: "Healthy Lifestyle Campaign",
        platforms: ["instagram", "youtube"] as Platform[],
        payoutPer1kViews: 850,
        totalBudget: 120000,
        spentBudget: 0,
        status: "paused" as const,
        startsAt: new Date("2026-08-15"),
        endsAt: new Date("2026-09-20"),
    },
    // 3 approved creators × 100k views × $9/1k = $2,700 spent = budget.
    {
        id: COMPLETED_CAMPAIGN_ID,
        title: "Winter Gaming Festival",
        platforms: ["youtube", "tiktok"] as Platform[],
        payoutPer1kViews: COMPLETED_PAYOUT_PER_1K,
        totalBudget: COMPLETED_BUDGET,
        spentBudget: COMPLETED_BUDGET,
        status: "completed" as const,
        startsAt: new Date("2026-07-01"),
        endsAt: new Date("2026-08-01"),
    },
    {
        id: "campaign-8",
        title: "Travel & Adventure Reels",
        platforms: ["instagram", "tiktok"] as Platform[],
        payoutPer1kViews: 550,
        totalBudget: 90000,
        spentBudget: 0,
        status: "active" as const,
        startsAt: new Date("2026-09-01"),
        endsAt: new Date("2026-09-25"),
    },
    // $50 total; each pending below costs $50 at 5k views × $10/1k →
    // first approve succeeds, second fails with BUDGET_EXCEEDED.
    {
        id: BUDGET_CEILING_CAMPAIGN_ID,
        title: "Budget Ceiling Demo",
        platforms: ["tiktok"] as Platform[],
        payoutPer1kViews: 1000,
        totalBudget: 5000,
        spentBudget: 0,
        status: "active" as const,
        startsAt: new Date("2026-09-01"),
        endsAt: new Date("2026-09-30"),
    },
    // $80 total; each pending below costs $80 at 10k views × $8/1k →
    // first approve succeeds, second fails with BUDGET_EXCEEDED.
    {
        id: ONE_APPROVE_CAMPAIGN_ID,
        title: "Podcast Promo Tight Budget",
        platforms: ["instagram", "youtube"] as Platform[],
        payoutPer1kViews: 800,
        totalBudget: 8000,
        spentBudget: 0,
        status: "active" as const,
        startsAt: new Date("2026-09-01"),
        endsAt: new Date("2026-09-30"),
    },
];

function postUrlFor(
    platform: Platform,
    campaignId: string,
    creatorId: string,
): string {
    const campaignNum = Number(campaignId.replace("campaign-", ""));
    const creatorNum = Number(creatorId.replace("creator-", ""));
    const videoId = String(1000000000 + campaignNum * 1000 + creatorNum);

    switch (platform) {
        case "tiktok":
            return `https://www.tiktok.com/@${creatorId}/video/${videoId}`;
        case "instagram":
            return `https://www.instagram.com/reel/C${campaignNum}Creator${creatorNum}/`;
        case "youtube":
            return `https://www.youtube.com/watch?v=camp${campaignNum}crt${creatorNum}`;
    }
}

function buildActiveCampaignData() {
    const active = campaignSeed.filter(
        (c) =>
            c.status === "active" &&
            !MANUAL_BUDGET_CAMPAIGN_IDS.has(c.id),
    );

    const rows: {
        id: string;
        campaignId: string;
        creatorId: string;
        postUrl: string;
        platform: Platform;
        status: SubmissionStatus;
        earningsCents: number | null;
        rejectionReason: string | null;
    }[] = [];
    const metrics: {
        id: string;
        submissionId: string;
        capturedAt: string;
        views: number;
        likes: number;
        comments: number;
    }[] = [];

    for (const campaign of active) {
        const campaignNum = campaign.id.replace("campaign-", "");

        for (const [index, creatorId] of CREATORS.entries()) {
            const platform =
                campaign.platforms[index % campaign.platforms.length]!;
            const intendedStatus = STATUSES[index]!;
            const views = viewsForSeedStatus(intendedStatus);
            const status = statusForSeed(intendedStatus, views);
            const creatorNum = creatorId.replace("creator-", "");
            const id = `submission-${campaignNum}-${creatorNum}`;

            rows.push({
                id,
                campaignId: campaign.id,
                creatorId,
                postUrl: postUrlFor(platform, campaign.id, creatorId),
                platform,
                status,
                earningsCents:
                    status === "approved"
                        ? calculatePayout(views, campaign.payoutPer1kViews)
                        : null,
                rejectionReason:
                    status === "rejected"
                        ? "The video does not meet the campaign requirements."
                        : null,
            });

            if (views > 0) {
                metrics.push({
                    id: `metric-${campaignNum}-${creatorNum}`,
                    submissionId: id,
                    capturedAt: SEED_METRIC_DAY,
                    views,
                    likes: 50,
                    comments: 5,
                });
            }
        }
    }

    return { rows, metrics };
}

function spentByCampaignId(
    rows: { campaignId: string; status: SubmissionStatus; earningsCents: number | null }[],
) {
    const spent = new Map<string, number>();

    for (const row of rows) {
        if (row.status !== "approved" || row.earningsCents == null) {
            continue;
        }

        spent.set(
            row.campaignId,
            (spent.get(row.campaignId) ?? 0) + row.earningsCents,
        );
    }

    return spent;
}

function buildCompletedCampaignSubmissions() {
    const campaign = campaignSeed.find(
        (c) => c.id === COMPLETED_CAMPAIGN_ID,
    )!;

    return CREATORS.map((creatorId, index) => {
        const platform =
            campaign.platforms[index % campaign.platforms.length]!;
        const creatorNum = creatorId.replace("creator-", "");

        return {
            id: `submission-7-${creatorNum}`,
            campaignId: campaign.id,
            creatorId,
            postUrl: postUrlFor(platform, campaign.id, creatorId),
            platform,
            status: "approved" as const,
            earningsCents: COMPLETED_EARNINGS,
            rejectionReason: null,
        };
    });
}

function buildCompletedCampaignMetrics() {
    return CREATORS.map((creatorId) => {
        const creatorNum = creatorId.replace("creator-", "");

        return {
            id: `metric-7-${creatorNum}`,
            submissionId: `submission-7-${creatorNum}`,
            capturedAt: "2026-07-15",
            views: COMPLETED_VIEWS_PER_CREATOR,
            likes: 800,
            comments: 40,
        };
    });
}

const budgetCeilingSubmissions = [
    {
        id: "sub-budget-a",
        campaignId: BUDGET_CEILING_CAMPAIGN_ID,
        creatorId: "creator-1",
        postUrl: "https://www.tiktok.com/@creator-1/video/9000000001",
        platform: "tiktok" as const,
        status: "pending" as const,
        earningsCents: null,
        rejectionReason: null,
    },
    {
        id: "sub-budget-b",
        campaignId: BUDGET_CEILING_CAMPAIGN_ID,
        creatorId: "creator-2",
        postUrl: "https://www.tiktok.com/@creator-2/video/9000000002",
        platform: "tiktok" as const,
        status: "pending" as const,
        earningsCents: null,
        rejectionReason: null,
    },
];

const budgetCeilingMetrics = [
    {
        id: "metric-budget-a",
        submissionId: "sub-budget-a",
        capturedAt: "2026-09-05",
        views: 5000,
        likes: 10,
        comments: 1,
    },
    {
        id: "metric-budget-b",
        submissionId: "sub-budget-b",
        capturedAt: "2026-09-05",
        views: 5000,
        likes: 10,
        comments: 1,
    },
];

const oneApproveSubmissions = [
    {
        id: "sub-one-approve-a",
        campaignId: ONE_APPROVE_CAMPAIGN_ID,
        creatorId: "creator-1",
        postUrl: "https://www.instagram.com/reel/C9Creator1/",
        platform: "instagram" as const,
        status: "pending" as const,
        earningsCents: null,
        rejectionReason: null,
    },
    {
        id: "sub-one-approve-b",
        campaignId: ONE_APPROVE_CAMPAIGN_ID,
        creatorId: "creator-2",
        postUrl: "https://www.youtube.com/watch?v=camp9crt2",
        platform: "youtube" as const,
        status: "pending" as const,
        earningsCents: null,
        rejectionReason: null,
    },
];

const oneApproveMetrics = [
    {
        id: "metric-one-approve-a",
        submissionId: "sub-one-approve-a",
        capturedAt: "2026-09-05",
        views: 10_000,
        likes: 40,
        comments: 4,
    },
    {
        id: "metric-one-approve-b",
        submissionId: "sub-one-approve-b",
        capturedAt: "2026-09-05",
        views: 10_000,
        likes: 40,
        comments: 4,
    },
];

async function seed() {
    console.log("Starting seed...");

    await db
        .insert(users)
        .values([
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

    console.log("Users seeded");

    const activeData = buildActiveCampaignData();
    const spent = spentByCampaignId(activeData.rows);

    await db
        .insert(campaigns)
        .values(
            campaignSeed.map((campaign) => ({
                ...campaign,
                spentBudget:
                    campaign.spentBudget > 0
                        ? campaign.spentBudget
                        : (spent.get(campaign.id) ?? 0),
            })),
        )
        .onConflictDoUpdate({
            target: campaigns.id,
            set: {
                title: sql`excluded.title`,
                platforms: sql`excluded.platforms`,
                payoutPer1kViews: sql`excluded.payout_per_1k_views`,
                totalBudget: sql`excluded.total_budget`,
                spentBudget: sql`excluded.spent_budget`,
                status: sql`excluded.status`,
                startsAt: sql`excluded.starts_at`,
                endsAt: sql`excluded.ends_at`,
                updatedAt: sql`now()`,
            },
        });

    console.log("Campaigns seeded");

    const submissionSeed = [
        ...activeData.rows,
        ...buildCompletedCampaignSubmissions(),
        ...budgetCeilingSubmissions,
        ...oneApproveSubmissions,
    ];

    await db
        .insert(submissions)
        .values(submissionSeed)
        .onConflictDoUpdate({
            target: submissions.id,
            set: {
                campaignId: sql`excluded.campaign_id`,
                creatorId: sql`excluded.creator_id`,
                postUrl: sql`excluded.post_url`,
                platform: sql`excluded.platform`,
                status: sql`excluded.status`,
                rejectionReason: sql`excluded.rejection_reason`,
                earningsCents: sql`excluded.earnings_cents`,
                updatedAt: sql`now()`,
            },
        });

    console.log(`Submissions seeded: ${submissionSeed.length}`);

    const metricSeed = [
        ...activeData.metrics,
        ...budgetCeilingMetrics,
        ...oneApproveMetrics,
        ...buildCompletedCampaignMetrics(),
    ];

    await db
        .insert(submissionMetrics)
        .values(metricSeed)
        .onConflictDoUpdate({
            target: submissionMetrics.id,
            set: {
                submissionId: sql`excluded.submission_id`,
                capturedAt: sql`excluded.captured_at`,
                views: sql`excluded.views`,
                likes: sql`excluded.likes`,
                comments: sql`excluded.comments`,
            },
        });

    await db.execute(sql`
        UPDATE submissions AS s
        SET
            status = 'pending',
            earnings_cents = NULL,
            updated_at = now()
        WHERE s.status = 'approved'
          AND COALESCE((
              SELECT sm.views
              FROM submission_metrics sm
              WHERE sm.submission_id = s.id
              ORDER BY sm.captured_at DESC
              LIMIT 1
          ), 0) = 0
    `);

    console.log(
        "Budget-ceiling campaigns seeded (approve one, second hits BUDGET_EXCEEDED)",
    );
    console.log("Seed complete");
    process.exit(0);
}

seed().catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
});
