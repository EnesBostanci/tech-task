"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/format";
import { trpc } from "@/trpc/client";

const STATUSES = [
    "",
    "draft",
    "active",
    "paused",
    "completed",
] as const;

export default function AdminCampaignsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<string>("");

    const { data, isLoading, error } = trpc.campaign.list.useQuery({
        page,
        pageSize: 5,
        search: search || undefined,
        status: status
            ? (status as "draft" | "active" | "paused" | "completed")
            : undefined,
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Campaigns
                </h1>
                <Link
                    href="/admin/campaigns/new"
                    className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
                >
                    New campaign
                </Link>
            </div>

            <div className="flex flex-wrap gap-3">
                <Input
                    placeholder="Search title…"
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                    className="max-w-xs"
                />
                <select
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={status}
                    onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(1);
                    }}
                >
                    {STATUSES.map((value) => (
                        <option key={value || "all"} value={value}>
                            {value || "All statuses"}
                        </option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <p className="text-muted-foreground">Loading…</p>
            ) : null}
            {error ? (
                <p className="text-destructive">{error.message}</p>
            ) : null}

            {data && data.items.length === 0 ? (
                <p className="text-muted-foreground">No campaigns found.</p>
            ) : null}

            {data && data.items.length > 0 ? (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Budget</TableHead>
                                <TableHead>Spent</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.items.map((campaign) => (
                                <TableRow key={campaign.id}>
                                    <TableCell>{campaign.title}</TableCell>
                                    <TableCell>{campaign.status}</TableCell>
                                    <TableCell>
                                        {formatCents(campaign.totalBudget)}
                                    </TableCell>
                                    <TableCell>
                                        {formatCents(campaign.spentBudget)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link
                                            href={`/admin/campaigns/${campaign.id}`}
                                            className="text-sm underline-offset-4 hover:underline"
                                        >
                                            View
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {data.page} of {data.pageCount}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= data.pageCount}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </>
            ) : null}
        </div>
    );
}
