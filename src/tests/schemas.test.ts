import { describe, expect, it } from "vitest";

import {
    campaignFormSchema,
    campaignUpdateSchema,
    PG_INTEGER_MAX,
    submissionCreateSchema,
} from "@/lib/schemas";

const payload = {
    title: "Summer clip",
    platforms: ["tiktok"] as const,
    payoutPer1kViews: 500,
    totalBudget: 10_000,
    status: "draft" as const,
};

describe("campaign date fields", () => {
    it("accepts ISO strings from tRPC JSON", () => {
        const parsed = campaignUpdateSchema.parse({
            id: "campaign-6",
            data: {
                ...payload,
                startsAt: "2026-09-01T00:00:00.000Z",
                endsAt: "2026-09-30T00:00:00.000Z",
            },
        });

        expect(parsed.data.startsAt).toBeInstanceOf(Date);
        expect(parsed.data.endsAt).toBeInstanceOf(Date);
    });

    it("still accepts Date objects from the form", () => {
        const parsed = campaignFormSchema.parse({
            ...payload,
            startsAt: new Date("2026-09-01T00:00:00.000Z"),
            endsAt: new Date("2026-09-30T00:00:00.000Z"),
        });

        expect(parsed.startsAt).toBeInstanceOf(Date);
        expect(parsed.endsAt).toBeInstanceOf(Date);
    });

    it("rejects an end date before the start date", () => {
        const result = campaignFormSchema.safeParse({
            ...payload,
            startsAt: new Date("2026-09-30T00:00:00.000Z"),
            endsAt: new Date("2026-09-01T00:00:00.000Z"),
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(["endsAt"]);
            expect(result.error.issues[0]?.message).toBe(
                "End date must be after start date",
            );
        }
    });
});

describe("campaign money fields", () => {
    it("rejects a payout that is not greater than 0", () => {
        const result = campaignFormSchema.safeParse({
            ...payload,
            payoutPer1kViews: -500,
            startsAt: new Date("2026-09-01T00:00:00.000Z"),
            endsAt: new Date("2026-09-30T00:00:00.000Z"),
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(["payoutPer1kViews"]);
            expect(result.error.issues[0]?.message).toBe(
                "Must be greater than 0",
            );
        }
    });

    it("rejects a budget larger than a Postgres integer", () => {
        const result = campaignFormSchema.safeParse({
            ...payload,
            totalBudget: 1_000_000_000_000_000,
            startsAt: new Date("2026-09-01T00:00:00.000Z"),
            endsAt: new Date("2026-09-30T00:00:00.000Z"),
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(["totalBudget"]);
            expect(result.error.issues[0]?.message).toBe(
                "Must be at most 2147483647",
            );
        }
    });

    it("rejects a payout larger than a Postgres integer", () => {
        const result = campaignFormSchema.safeParse({
            ...payload,
            payoutPer1kViews: PG_INTEGER_MAX + 1,
            startsAt: new Date("2026-09-01T00:00:00.000Z"),
            endsAt: new Date("2026-09-30T00:00:00.000Z"),
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(["payoutPer1kViews"]);
            expect(result.error.issues[0]?.message).toBe(
                "Must be at most 2147483647",
            );
        }
    });

    it("still shows the max message when the number is too big to be an integer", () => {
        const result = campaignFormSchema.safeParse({
            ...payload,
            totalBudget: 1e21,
            startsAt: new Date("2026-09-01T00:00:00.000Z"),
            endsAt: new Date("2026-09-30T00:00:00.000Z"),
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(["totalBudget"]);
            expect(result.error.issues[0]?.message).toBe(
                "Must be at most 2147483647",
            );
        }
    });
});

describe("submission post URLs", () => {
    const base = {
        campaignId: "campaign-1",
    };

    it.each([
        [
            "tiktok",
            "www.tiktok.com/@creator/video/1234567890",
            "https://www.tiktok.com/@creator/video/1234567890",
        ],
        [
            "tiktok",
            "tiktok.com/@creator/video/1234567890",
            "https://tiktok.com/@creator/video/1234567890",
        ],
        [
            "instagram",
            "www.instagram.com/reel/AbC123/",
            "https://www.instagram.com/reel/AbC123/",
        ],
        [
            "instagram",
            "instagram.com/p/AbC123",
            "https://instagram.com/p/AbC123",
        ],
        [
            "youtube",
            "www.youtube.com/watch?v=dQw4w9wgGcQ",
            "https://www.youtube.com/watch?v=dQw4w9wgGcQ",
        ],
        [
            "youtube",
            "youtube.com/shorts/dQw4w9wgGcQ",
            "https://youtube.com/shorts/dQw4w9wgGcQ",
        ],
        [
            "youtube",
            "youtu.be/dQw4w9wgGcQ",
            "https://youtu.be/dQw4w9wgGcQ",
        ],
    ] as const)("accepts %s link %s", (platform, postUrl, expected) => {
        const parsed = submissionCreateSchema.parse({
            ...base,
            platform,
            postUrl,
        });

        expect(parsed.postUrl).toBe(expected);
    });

    it("still accepts full https URLs", () => {
        const parsed = submissionCreateSchema.parse({
            ...base,
            platform: "tiktok",
            postUrl: "https://www.tiktok.com/@creator/video/1234567890",
        });

        expect(parsed.postUrl).toBe(
            "https://www.tiktok.com/@creator/video/1234567890",
        );
    });

    it("rejects a URL that is not a post on the selected platform", () => {
        const result = submissionCreateSchema.safeParse({
            ...base,
            platform: "youtube",
            postUrl: "www.instagram.com/reel/AbC123/",
        });

        expect(result.success).toBe(false);
    });
});
