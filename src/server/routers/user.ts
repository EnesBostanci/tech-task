import { eq } from "drizzle-orm";
import { z } from "zod";

import { setSessionUserId } from "@/server/auth";
import { users } from "@/server/db/schema";
import {
    protectedProcedure,
    publicProcedure,
    router,
} from "@/server/trpc";
import { TRPCError } from "@trpc/server";

export const userRouter = router({
    me: publicProcedure.query(({ ctx }) => ctx.user),

    list: publicProcedure.query(async ({ ctx }) => {
        return ctx.db
            .select({
                id: users.id,
                email: users.email,
                role: users.role,
            })
            .from(users)
            .orderBy(users.email);
    }),

    switchUser: publicProcedure
        .input(z.object({ userId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const [user] = await ctx.db
                .select()
                .from(users)
                .where(eq(users.id, input.userId))
                .limit(1);

            if (!user) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User not found",
                });
            }

            await setSessionUserId(user.id);

            return user;
        }),

    requireMe: protectedProcedure.query(({ ctx }) => ctx.user),
});
