"use client";

import { useParams, useRouter } from "next/navigation";

import { CampaignForm } from "@/components/campaign-form";
import { trpc } from "@/trpc/client";

export default function EditCampaignPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { data, isLoading } = trpc.campaign.byId.useQuery(params.id);
    const update = trpc.campaign.update.useMutation({
        onSuccess: () => {
            router.push(`/admin/campaigns/${params.id}`);
        },
    });

    if (isLoading) {
        return <p className="text-muted-foreground">Loading…</p>;
    }

    if (!data) {
        return <p className="text-destructive">Campaign not found.</p>;
    }

    return (
        <div className="mx-auto max-w-xl space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">
                Edit campaign
            </h1>
            <CampaignForm
                submitLabel="Save"
                isPending={update.isPending}
                defaultValues={{
                    title: data.title,
                    platforms: data.platforms,
                    payoutPer1kViews: data.payoutPer1kViews,
                    totalBudget: data.totalBudget,
                    status: data.status,
                    startsAt: new Date(data.startsAt),
                    endsAt: new Date(data.endsAt),
                }}
                onSubmit={async (values) => {
                    await update.mutateAsync({
                        id: params.id,
                        data: values,
                    });
                }}
            />
            {update.error ? (
                <p className="text-sm text-destructive">
                    {update.error.message}
                </p>
            ) : null}
        </div>
    );
}
