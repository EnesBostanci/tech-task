import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

import { getSessionUserId } from "./auth";

export async function createContext() {
    const userId =
        await getSessionUserId();

    if (!userId) {
        return {
            db,
            user: null,
        };
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    return {
        db,
        user: user ?? null,
    };
}

export type Context = Awaited<
    ReturnType<typeof createContext>
>;