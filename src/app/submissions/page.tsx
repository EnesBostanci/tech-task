"use client";

import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCents, formatNumber } from "@/lib/format";
import { trpc } from "@/trpc/client";

function statusBadgeVariant(status: string) {
    if (status === "rejected") return "destructive" as const;
    if (status === "approved" || status === "paid") {
        return "default" as const;
    }
    return "secondary" as const;
}

export default function MySubmissionsPage() {
    const { data, isLoading, error } = trpc.submission.mine.useQuery();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">
                My submissions
            </h1>

            {isLoading ? (
                <p className="text-muted-foreground">Loading…</p>
            ) : null}
            {error ? (
                <p className="text-destructive">{error.message}</p>
            ) : null}
            {data && data.length === 0 ? (
                <p className="text-muted-foreground">
                    You have not submitted any clips yet.
                </p>
            ) : null}

            {data && data.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Campaign</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Views</TableHead>
                            <TableHead>Earnings</TableHead>
                            <TableHead>URL</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.campaignTitle}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={statusBadgeVariant(
                                            row.status,
                                        )}
                                    >
                                        {row.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="max-w-xs whitespace-normal text-sm">
                                    {row.status === "rejected" &&
                                    row.rejectionReason ? (
                                        <span className="text-destructive">
                                            {row.rejectionReason}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {formatNumber(row.currentViews)}
                                </TableCell>
                                <TableCell>
                                    {row.status === "approved" ||
                                    row.status === "paid" ? (
                                        formatCents(row.estimatedEarnings)
                                    ) : (
                                        <span className="text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                    <a
                                        href={row.postUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline-offset-4 hover:underline"
                                    >
                                        {row.postUrl}
                                    </a>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : null}
        </div>
    );
}
