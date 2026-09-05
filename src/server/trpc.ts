// trpc backend - Initialization of tRPC backend Export reusable router and procedure helpers 
import {
    initTRPC,
    TRPCError,
} from "@trpc/server";

import type { Context } from "./context";

const t = initTRPC
    .context<Context>()
    .create();

export const router = t.router;

export const publicProcedure =
    t.procedure;

export const protectedProcedure =
    t.procedure.use(
        async ({ ctx, next }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Authentication required",
                });
            }

            return next({
                ctx: {
                    ...ctx,
                    user: ctx.user,
                },
            });
        },
    );

export const adminProcedure =
    protectedProcedure.use(
        async ({ ctx, next }) => {
            if (ctx.user.role !== "admin") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Admin access required",
                });
            }

            return next();
        },
    );

export const creatorProcedure =
    protectedProcedure.use(
        async ({ ctx, next }) => {
            if (ctx.user.role !== "creator") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Creator access required",
                });
            }

            return next();
        },
    );