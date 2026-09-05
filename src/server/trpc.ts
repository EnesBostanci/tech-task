import {
    initTRPC,
    TRPCError,
} from "@trpc/server";

import type { AppErrorCode } from "@/lib/errors";
import type { Context } from "./context";

export type AppErrorData = {
    appCode?: AppErrorCode;
};

const t = initTRPC
    .context<Context>()
    .create({
        errorFormatter({ shape, error }) {
            const cause = error.cause as
                | { appCode?: AppErrorCode }
                | undefined;

            return {
                ...shape,
                data: {
                    ...shape.data,
                    appCode: cause?.appCode,
                } satisfies AppErrorData & typeof shape.data,
            };
        },
    });

export const router = t.router;

export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(
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

export const adminProcedure = protectedProcedure.use(
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

export const creatorProcedure = protectedProcedure.use(
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

export function appError(
    code: TRPCError["code"],
    message: string,
    appCode: AppErrorCode,
) {
    return new TRPCError({
        code,
        message,
        cause: { appCode },
    });
}
