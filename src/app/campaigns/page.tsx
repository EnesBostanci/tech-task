"use client";

import Link from "next/link";

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

export default function CreatorCampaignsPage() {
    const { data, isLoading, error } =
        trpc.campaign.listActive.useQuery();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">
                Active campaigns
            </h1>

            {isLoading ? (
                <p className="text-muted-foreground">Loading…</p>
            ) : null}
            {error ? (
                <p className="text-destructive">{error.message}</p>
            ) : null}
            {data && data.length === 0 ? (
                <p className="text-muted-foreground">
                    No active campaigns right now.
                </p>
            ) : null}

            {data && data.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Platforms</TableHead>
                            <TableHead>Payout / 1k</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((campaign) => (
                            <TableRow key={campaign.id}>
                                <TableCell>{campaign.title}</TableCell>
                                <TableCell>
                                    {campaign.platforms.join(", ")}
                                </TableCell>
                                <TableCell>
                                    {formatCents(
                                        campaign.payoutPer1kViews,
                                    )}
                                </TableCell>
                                    <TableCell className="text-right">
                                    <Link
                                        href={`/campaigns/${campaign.id}/submit`}
                                        className="inline-flex h-7 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
                                    >
                                        Submit clip
                                    </Link>
                                    </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : null}
        </div>
    );
}
