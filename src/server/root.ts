import { createCallerFactory, router } from "@/server/trpc";
import { campaignRouter } from "@/server/routers/campaign";
import { submissionRouter } from "@/server/routers/submission";
import { userRouter } from "@/server/routers/user";

export const appRouter = router({
    campaign: campaignRouter,
    submission: submissionRouter,
    user: userRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
