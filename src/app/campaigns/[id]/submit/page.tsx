"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ERROR_CODES } from "@/lib/errors";
import {
    submissionCreateSchema,
    type SubmissionCreateValues,
} from "@/lib/schemas";
import { trpc } from "@/trpc/client";

export default function SubmitClipPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const campaign = trpc.campaign.listActive.useQuery(undefined, {
        select: (items) => items.find((c) => c.id === params.id),
    });

    const form = useForm<SubmissionCreateValues>({
        resolver: zodResolver(submissionCreateSchema),
        defaultValues: {
            campaignId: params.id,
            platform: "tiktok",
            postUrl: "",
        },
    });

    const platforms = campaign.data?.platforms ?? [];

    useEffect(() => {
        const allowed = campaign.data?.platforms;
        if (!allowed?.length) {
            return;
        }

        const current = form.getValues("platform");
        const fallback = allowed[0];
        if (fallback && !allowed.includes(current)) {
            form.setValue("platform", fallback);
        }
    }, [campaign.data, form]);

    const create = trpc.submission.create.useMutation({
        onSuccess: () => {
            router.push("/submissions");
        },
    });

    return (
        <div className="mx-auto max-w-lg space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Submit a clip
                </h1>
                {campaign.data ? (
                    <p className="text-sm text-muted-foreground">
                        {campaign.data.title}
                    </p>
                ) : null}
            </div>

            <form
                className="space-y-4"
                onSubmit={form.handleSubmit(async (values) => {
                    await create.mutateAsync(values);
                })}
            >
                <input type="hidden" {...form.register("campaignId")} />

                <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <select
                        id="platform"
                        className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                        {...form.register("platform")}
                    >
                        {platforms.map((platform) => (
                            <option key={platform} value={platform}>
                                {platform}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="postUrl">Post URL</Label>
                    <Input id="postUrl" {...form.register("postUrl")} />
                    {form.formState.errors.postUrl ? (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.postUrl.message}
                        </p>
                    ) : null}
                </div>

                <Button
                    type="submit"
                    disabled={create.isPending || !campaign.data}
                >
                    {create.isPending ? "Submitting…" : "Submit"}
                </Button>

                {create.error ? (
                    <p className="text-sm text-destructive">
                        {(
                            create.error.data as
                                | { appCode?: string }
                                | undefined
                        )?.appCode === ERROR_CODES.DUPLICATE_URL
                            ? "This URL was already submitted to this campaign."
                            : create.error.message}
                    </p>
                ) : null}
            </form>
        </div>
    );
}
