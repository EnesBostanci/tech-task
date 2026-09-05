"use client";

import Link from "next/link";

import { UserSwitcher } from "@/components/user-switcher";
import { trpc } from "@/trpc/client";

export function AppHeader() {
    const { data: me } = trpc.user.me.useQuery();

    return (
        <header className="border-b border-border">
            <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-4">
                    <Link href="/" className="font-semibold tracking-tight">
                        ClipPay
                    </Link>
                    {me?.role === "admin" ? (
                        <nav className="flex gap-3 text-sm">
                            <Link
                                href="/admin/campaigns"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Campaigns
                            </Link>
                        </nav>
                    ) : null}
                    {me?.role === "creator" ? (
                        <nav className="flex gap-3 text-sm">
                            <Link
                                href="/campaigns"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Campaigns
                            </Link>
                            <Link
                                href="/submissions"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                My submissions
                            </Link>
                        </nav>
                    ) : null}
                </div>
                <UserSwitcher />
            </div>
        </header>
    );
}
