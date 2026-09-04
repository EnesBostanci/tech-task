import {
    date,
    index,
    integer,
    pgEnum,
    pgTable,
    text,
    timestamp,
    unique,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
    "admin",
    "creator",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
    "draft",
    "active",
    "paused",
    "completed",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
    "pending",
    "approved",
    "rejected",
    "paid",
]);

export const platformEnum = pgEnum("platform", [
    "tiktok",
    "instagram",
    "youtube",
]);

export const users = pgTable("users", {
    id: text("id").primaryKey(),

    email: text("email")
        .notNull()
        .unique(),

    role: userRoleEnum("role")
        .notNull(),

    createdAt: timestamp("created_at")
        .defaultNow()
        .notNull(),
});

export const campaigns = pgTable(
    "campaigns",
    {
        id: text("id").primaryKey(),

        title: text("title")
            .notNull(),

        platforms: platformEnum("platforms")
            .array()
            .notNull(),

        payoutPer1kViews: integer("payout_per_1k_views")
            .notNull(),

        totalBudget: integer("total_budget")
            .notNull(),

        spentBudget: integer("spent_budget")
            .notNull()
            .default(0),

        status: campaignStatusEnum("status")
            .notNull()
            .default("draft"),

        startsAt: timestamp("starts_at")
            .notNull(),

        endsAt: timestamp("ends_at")
            .notNull(),

        createdAt: timestamp("created_at")
            .defaultNow()
            .notNull(),

        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull(),
    },
    (table) => ({
        statusIndex: index("campaign_status_idx")
            .on(table.status),
    }),
);

export const submissions = pgTable(
    "submissions",
    {
        id: text("id").primaryKey(),

        campaignId: text("campaign_id")
            .notNull()
            .references(() => campaigns.id, {
                onDelete: "cascade",
            }),

        creatorId: text("creator_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        postUrl: text("post_url")
            .notNull(),

        platform: platformEnum("platform")
            .notNull(),

        status: submissionStatusEnum("status")
            .notNull()
            .default("pending"),

        rejectionReason: text("rejection_reason"),

        createdAt: timestamp("created_at")
            .defaultNow()
            .notNull(),

        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull(),
    },
    (table) => ({
        campaignUrlUnique: unique(
            "campaign_post_url_unique",
        ).on(
            table.campaignId,
            table.postUrl,
        ),

        creatorIndex: index(
            "submission_creator_idx",
        ).on(table.creatorId),

        campaignStatusIndex: index(
            "submission_campaign_status_idx",
        ).on(
            table.campaignId,
            table.status,
        ),
    }),
);

export const submissionMetrics = pgTable(
    "submission_metrics",
    {
        id: text("id").primaryKey(),

        submissionId: text("submission_id")
            .notNull()
            .references(() => submissions.id, {
                onDelete: "cascade",
            }),

        capturedAt: date("captured_at")
            .notNull(),

        views: integer("views")
            .notNull()
            .default(0),

        likes: integer("likes")
            .notNull()
            .default(0),

        comments: integer("comments")
            .notNull()
            .default(0),
    },
    (table) => ({
        submissionDateUnique: unique(
            "submission_metric_date_unique",
        ).on(
            table.submissionId,
            table.capturedAt,
        ),
    }),
);