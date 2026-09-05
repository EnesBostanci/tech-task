"use client";

import Link from "next/link";

import { trpc } from "@/trpc/client";

export default function HomePage() {
    const { data: me, isLoading } = trpc.user.me.useQuery();

    if (isLoading) {
        return <p className="text-muted-foreground">Loading…</p>;
    }

    if (!me) {
        return (
            <div className="space-y-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                    ClipPay
                </h1>
                <p className="text-muted-foreground">
                    Use the user switcher in the header to sign in as an
                    admin or creator.
                </p>
            </div>
        );
    }

    if (me.role === "admin") {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Admin
                </h1>
                <Link
                    href="/admin/campaigns"
                    className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
                >
                    Go to campaigns
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight">
                Creator
            </h1>
            <div className="flex gap-2">
                <Link
                    href="/campaigns"
                    className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
                >
                    Browse campaigns
                </Link>
                <Link
                    href="/submissions"
                    className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium"
                >
                    My submissions
                </Link>
            </div>
        </div>
    );
}
