"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type Resolver } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    campaignFormSchema,
    PG_INTEGER_MAX,
    type CampaignFormValues,
} from "@/lib/schemas";

const PLATFORMS = ["tiktok", "instagram", "youtube"] as const;
const STATUSES = ["draft", "active", "paused", "completed"] as const;

type Props = {
    defaultValues?: Partial<CampaignFormValues>;
    submitLabel: string;
    onSubmit: (values: CampaignFormValues) => Promise<void> | void;
    isPending?: boolean;
};

function toDatetimeLocal(value?: Date) {
    if (!value || Number.isNaN(value.getTime())) return "";
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDatetimeLocal(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
    if (!match) return new Date(Number.NaN);
    const [, year, month, day, hour, minute] = match;
    return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <p className="text-sm text-destructive" role="alert">
            {message}
        </p>
    );
}

export function CampaignForm({
    defaultValues,
    submitLabel,
    onSubmit,
    isPending,
}: Props) {
    const form = useForm<CampaignFormValues>({
        resolver: zodResolver(
            campaignFormSchema,
        ) as Resolver<CampaignFormValues>,
        defaultValues: {
            title: defaultValues?.title ?? "",
            platforms: defaultValues?.platforms ?? ["tiktok"],
            payoutPer1kViews: defaultValues?.payoutPer1kViews ?? 500,
            totalBudget: defaultValues?.totalBudget ?? 10_000,
            status: defaultValues?.status ?? "draft",
            startsAt: defaultValues?.startsAt ?? new Date(),
            endsAt:
                defaultValues?.endsAt ??
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    });

    const { errors } = form.formState;
    const startsAt = form.watch("startsAt");

    return (
        <form
            noValidate
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
                await onSubmit(values);
            })}
        >
            <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                    id="title"
                    aria-invalid={!!errors.title}
                    {...form.register("title")}
                />
                <FieldError message={errors.title?.message} />
            </div>

            <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Platforms</legend>
                <div className="flex flex-wrap gap-3">
                    {PLATFORMS.map((platform) => (
                        <label
                            key={platform}
                            className="flex items-center gap-2 text-sm"
                        >
                            <input
                                type="checkbox"
                                value={platform}
                                checked={form
                                    .watch("platforms")
                                    .includes(platform)}
                                onChange={(event) => {
                                    const current =
                                        form.getValues("platforms");
                                    if (event.target.checked) {
                                        form.setValue("platforms", [
                                            ...current,
                                            platform,
                                        ], { shouldValidate: true });
                                    } else {
                                        form.setValue(
                                            "platforms",
                                            current.filter(
                                                (p) => p !== platform,
                                            ),
                                            { shouldValidate: true },
                                        );
                                    }
                                }}
                            />
                            {platform}
                        </label>
                    ))}
                </div>
                <FieldError message={errors.platforms?.message} />
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="payout">Payout per 1k views (cents)</Label>
                    <Input
                        id="payout"
                        type="number"
                        min={1}
                        max={PG_INTEGER_MAX}
                        step={1}
                        aria-invalid={!!errors.payoutPer1kViews}
                        {...form.register("payoutPer1kViews", {
                            valueAsNumber: true,
                        })}
                    />
                    <FieldError message={errors.payoutPer1kViews?.message} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="budget">Total budget (cents)</Label>
                    <Input
                        id="budget"
                        type="number"
                        min={1}
                        max={PG_INTEGER_MAX}
                        step={1}
                        aria-invalid={!!errors.totalBudget}
                        {...form.register("totalBudget", {
                            valueAsNumber: true,
                        })}
                    />
                    <FieldError message={errors.totalBudget?.message} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                    id="status"
                    aria-invalid={!!errors.status}
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    {...form.register("status")}
                >
                    {STATUSES.map((status) => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </select>
                <FieldError message={errors.status?.message} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="startsAt">Starts at</Label>
                    <Controller
                        control={form.control}
                        name="startsAt"
                        render={({ field, fieldState }) => (
                            <Input
                                id="startsAt"
                                type="datetime-local"
                                name={field.name}
                                ref={field.ref}
                                value={toDatetimeLocal(field.value)}
                                aria-invalid={fieldState.invalid}
                                onBlur={field.onBlur}
                                onValueChange={(value) => {
                                    field.onChange(parseDatetimeLocal(value));
                                    void form.trigger("endsAt");
                                }}
                            />
                        )}
                    />
                    <FieldError message={errors.startsAt?.message} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="endsAt">Ends at</Label>
                    <Controller
                        control={form.control}
                        name="endsAt"
                        render={({ field, fieldState }) => (
                            <Input
                                id="endsAt"
                                type="datetime-local"
                                name={field.name}
                                ref={field.ref}
                                value={toDatetimeLocal(field.value)}
                                min={toDatetimeLocal(startsAt)}
                                aria-invalid={fieldState.invalid}
                                onBlur={field.onBlur}
                                onValueChange={(value) => {
                                    field.onChange(parseDatetimeLocal(value));
                                    void form.trigger("endsAt");
                                }}
                            />
                        )}
                    />
                    <FieldError message={errors.endsAt?.message} />
                </div>
            </div>

            <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : submitLabel}
            </Button>
        </form>
    );
}
