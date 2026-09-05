import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { homePathForRole, type UserRole } from "@/lib/roles";
import { getSessionUserId } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

export async function requireRole(role: UserRole) {
    const userId = await getSessionUserId();

    if (!userId) {
        redirect("/");
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user) {
        redirect("/");
    }

    if (user.role !== role) {
        redirect(homePathForRole(user.role));
    }

    return user;
}
