import crypto from "node:crypto";

import { cookies } from "next/headers";

const COOKIE_NAME = "session";

function sign(value: string) {
    return crypto
        .createHmac("sha256", process.env.AUTH_SECRET!)
        .update(value)
        .digest("hex");
}

export function createSessionValue(userId: string) {
    return `${userId}.${sign(userId)}`;
}

function verifySessionValue(value: string) {
    const [userId, signature] = value.split(".");

    if (!userId || !signature) {
        return null;
    }

    const expected = sign(userId);

    if (signature !== expected) {
        return null;
    }

    return userId;
}

export async function getSessionUserId() {
    const cookieStore = await cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;

    if (!session) {
        return null;
    }

    return verifySessionValue(session);
}

export async function setSessionUserId(userId: string) {
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, createSessionValue(userId), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
    });
}

export { COOKIE_NAME };
