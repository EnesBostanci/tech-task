import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { campaigns, submissions } from "@/server/db/schema";

export const platformSchema = z.enum([
    "tiktok",
    "instagram",
    "youtube",
]);

export const campaignStatusSchema = z.enum([
    "draft",
    "active",
    "paused",
    "completed",
]);

export const submissionStatusSchema = z.enum([
    "pending",
    "approved",
    "rejected",
    "paid",
]);

const campaignInsertBase = createInsertSchema(campaigns);

export const campaignFormSchema = campaignInsertBase
    .omit({
        id: true,
        spentBudget: true,
        createdAt: true,
        updatedAt: true,
    })
    .extend({
        title: z.string().trim().min(1).max(200),
        platforms: z
            .array(platformSchema)
            .min(1, "Select at least one platform"),
        payoutPer1kViews: z
            .number()
            .int("Must be a whole number")
            .positive("Must be greater than 0"),
        totalBudget: z
            .number()
            .int("Must be a whole number")
            .positive("Must be greater than 0"),
        status: campaignStatusSchema,
        // tRPC JSON serializes Date as ISO strings; coerce so create/update work.
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
    })
    .refine((data) => data.startsAt < data.endsAt, {
        message: "End date must be after start date",
        path: ["endsAt"],
    });

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

export const campaignUpdateSchema = z.object({
    id: z.string().min(1),
    data: campaignFormSchema,
});

export type CampaignUpdateValues = z.infer<typeof campaignUpdateSchema>;

export const campaignListInputSchema = z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(50).default(5),
    search: z.string().trim().optional(),
    status: campaignStatusSchema.optional(),
});

const TIKTOK_URL =
    /^(https?:\/\/)?(www\.)?(tiktok\.com\/@[\w.-]+\/video\/\d+|vm\.tiktok\.com\/[\w]+)/i;
const INSTAGRAM_URL =
    /^(https?:\/\/)?(www\.)?instagram\.com\/(reel|p|tv)\/[\w-]+\/?/i;
const YOUTUBE_URL =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=[\w-]+|shorts\/[\w-]+)|youtu\.be\/[\w-]+)/i;

export function normalizePostUrl(url: string): string {
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return `https://${trimmed}`;
}

export function isValidPostUrl(
    platform: z.infer<typeof platformSchema>,
    url: string,
): boolean {
    const normalized = normalizePostUrl(url);
    switch (platform) {
        case "tiktok":
            return TIKTOK_URL.test(normalized);
        case "instagram":
            return INSTAGRAM_URL.test(normalized);
        case "youtube":
            return YOUTUBE_URL.test(normalized);
        default:
            return false;
    }
}

const submissionInsertBase = createInsertSchema(submissions);

export const submissionCreateSchema = submissionInsertBase
    .omit({
        id: true,
        creatorId: true,
        status: true,
        rejectionReason: true,
        earningsCents: true,
        createdAt: true,
        updatedAt: true,
    })
    .extend({
        campaignId: z.string().min(1),
        platform: platformSchema,
        postUrl: z
            .string()
            .trim()
            .min(1)
            .max(500)
            .transform(normalizePostUrl),
    })
    .refine(
        (data) => isValidPostUrl(data.platform, data.postUrl),
        {
            message:
                "URL must look like a real post on the selected platform",
            path: ["postUrl"],
        },
    );

export type SubmissionCreateValues = z.infer<
    typeof submissionCreateSchema
>;

export const rejectSubmissionSchema = z.object({
    submissionId: z.string().min(1),
    reason: z.string().trim().min(1).max(1000),
});

export const approveSubmissionSchema = z.object({
    submissionId: z.string().min(1),
});
