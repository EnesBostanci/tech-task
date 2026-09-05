"use client";

import { useRouter } from "next/navigation";

import { CampaignForm } from "@/components/campaign-form";
import { trpc } from "@/trpc/client";

export default function NewCampaignPage() {
    const router = useRouter();
    const create = trpc.campaign.create.useMutation({
        onSuccess: (campaign) => {
            router.push(`/admin/campaigns/${campaign.id}`);
        },
    });

    return (
        <div className="mx-auto max-w-xl space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">
                New campaign
            </h1>
            <CampaignForm
                submitLabel="Create"
                isPending={create.isPending}
                onSubmit={async (values) => {
                    await create.mutateAsync(values);
                }}
            />
            {create.error ? (
                <p className="text-sm text-destructive">
                    {create.error.message}
                </p>
            ) : null}
        </div>
    );
}
