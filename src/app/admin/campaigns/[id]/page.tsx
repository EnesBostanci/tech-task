"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ERROR_CODES } from "@/lib/errors";
import { formatCents, formatNumber } from "@/lib/format";
import { trpc } from "@/trpc/client";

export default function CampaignDetailPage() {
    const params = useParams<{ id: string }>();
    const utils = trpc.useUtils();
    const overview = trpc.campaign.overview.useQuery(params.id);
    const pending = trpc.submission.pendingByCampaign.useQuery({
        campaignId: params.id,
    });

    const [rejectId, setRejectId] = useState<string | null>(null);
    const [reason, setReason] = useState("");
    const [approveError, setApproveError] = useState<string | null>(
        null,
    );

    const approve = trpc.submission.approve.useMutation({
        onSuccess: async () => {
            setApproveError(null);
            await Promise.all([
                utils.campaign.overview.invalidate(),
                utils.campaign.list.invalidate(),
                utils.campaign.byId.invalidate(),
                utils.submission.pendingByCampaign.invalidate(),
            ]);
        },
        onError: (error) => {
            const appCode = (
                error.data as { appCode?: string } | undefined
            )?.appCode;
            if (appCode === ERROR_CODES.BUDGET_EXCEEDED) {
                setApproveError(
                    "Budget exceeded — this approval would push the campaign over its total budget.",
                );
            } else {
                setApproveError(error.message);
            }
        },
    });

    const reject = trpc.submission.reject.useMutation({
        onSuccess: async () => {
            setRejectId(null);
            setReason("");
            await utils.submission.pendingByCampaign.invalidate({
                campaignId: params.id,
            });
        },
    });

    if (overview.isLoading) {
        return <p className="text-muted-foreground">Loading…</p>;
    }

    if (!overview.data) {
        return <p className="text-destructive">Campaign not found.</p>;
    }

    const { campaign, totalApprovedViews, budgetSpent, budgetLeft, dailyViews } =
        overview.data;

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {campaign.title}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {campaign.status} ·{" "}
                        {campaign.platforms.join(", ")}
                    </p>
                </div>
                <Link
                    href={`/admin/campaigns/${campaign.id}/edit`}
                    className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium"
                >
                    Edit
                </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">
                        Approved views
                    </p>
                    <p className="text-xl font-semibold">
                        {formatNumber(totalApprovedViews)}
                    </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">
                        Budget spent
                    </p>
                    <p className="text-xl font-semibold">
                        {formatCents(budgetSpent)}
                    </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">
                        Budget left
                    </p>
                    <p className="text-xl font-semibold">
                        {formatCents(budgetLeft)}
                    </p>
                </div>
            </div>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">Daily views</h2>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyViews}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11 }}
                                minTickGap={24}
                            />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="views"
                                stroke="currentColor"
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-medium">Review queue</h2>
                {approveError ? (
                    <p className="text-sm text-destructive" role="alert">
                        {approveError}
                    </p>
                ) : null}
                {pending.isLoading ? (
                    <p className="text-muted-foreground">Loading…</p>
                ) : null}
                {pending.data && pending.data.length === 0 ? (
                    <p className="text-muted-foreground">
                        No pending submissions.
                    </p>
                ) : null}
                {pending.data && pending.data.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>URL</TableHead>
                                <TableHead>Platform</TableHead>
                                <TableHead>Creator</TableHead>
                                <TableHead>Views</TableHead>
                                <TableHead>Payout</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pending.data.map((submission) => (
                                <TableRow key={submission.id}>
                                    <TableCell className="max-w-xs truncate">
                                        <a
                                            href={submission.postUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {submission.postUrl}
                                        </a>
                                    </TableCell>
                                    <TableCell>
                                        {submission.platform}
                                    </TableCell>
                                    <TableCell>
                                        {submission.creatorId}
                                    </TableCell>
                                    <TableCell>
                                        {formatNumber(submission.currentViews)}
                                    </TableCell>
                                    <TableCell>
                                        {formatCents(
                                            submission.estimatedPayout,
                                        )}
                                    </TableCell>
                                    <TableCell className="space-x-2 text-right">
                                        <Button
                                            size="sm"
                                            disabled={approve.isPending}
                                            onClick={() =>
                                                approve.mutate({
                                                    submissionId:
                                                        submission.id,
                                                })
                                            }
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setRejectId(submission.id);
                                                setReason("");
                                            }}
                                        >
                                            Reject
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : null}
            </section>

            <Dialog
                open={rejectId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setRejectId(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject submission</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea
                            id="reason"
                            value={reason}
                            onChange={(event) =>
                                setReason(event.target.value)
                            }
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRejectId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={
                                !reason.trim() || reject.isPending
                            }
                            onClick={() => {
                                if (!rejectId) return;
                                reject.mutate({
                                    submissionId: rejectId,
                                    reason: reason.trim(),
                                });
                            }}
                        >
                            Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
