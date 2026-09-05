import "dotenv/config";

import { eq, sql } from "drizzle-orm";

import type { Context } from "@/server/context";
import { db } from "@/server/db";
import {
    campaigns,
    submissionMetrics,
    submissions,
    users,
} from "@/server/db/schema";
import { createCaller } from "@/server/root";

export async function resetDb() {
    await db.execute(sql`
        TRUNCATE TABLE submission_metrics, submissions, campaigns, users
        CASCADE
    `);
}

export async function seedMinimal() {
    await db.insert(users).values([
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
    ]);

    await db.insert(campaigns).values({
        id: "campaign-budget",
        title: "Budget Test",
        platforms: ["tiktok"],
        payoutPer1kViews: 1000,
        totalBudget: 5000,
        spentBudget: 0,
        status: "active",
        startsAt: new Date("2026-09-01"),
        endsAt: new Date("2026-09-30"),
    });
}

export function callerFor(user: Context["user"]) {
    return createCaller({
        db,
        user,
    });
}

export async function adminUser() {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, "admin-1"));
    return user!;
}

export async function creatorUser(id = "creator-1") {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
    return user!;
}

export {
    db,
    campaigns,
    submissions,
    submissionMetrics,
    users,
};
