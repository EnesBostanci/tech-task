"use client";

import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { homePathForRole, requiredRoleForPath } from "@/lib/roles";
import { trpc } from "@/trpc/client";

export function UserSwitcher() {
    const router = useRouter();
    const pathname = usePathname();
    const utils = trpc.useUtils();
    const { data: me } = trpc.user.me.useQuery();
    const { data: users } = trpc.user.list.useQuery();
    const switchUser = trpc.user.switchUser.useMutation({
        onSuccess: (user) => {
            const required = requiredRoleForPath(pathname);
            if (required && user.role !== required) {
                router.replace(homePathForRole(user.role));
            } else {
                router.refresh();
            }
            void utils.invalidate();
        },
    });

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
                {me
                    ? `${me.email} (${me.role})`
                    : "Not signed in"}
            </span>
            <label className="sr-only" htmlFor="user-switcher">
                Switch user
            </label>
            <select
                id="user-switcher"
                className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                value={me?.id ?? ""}
                onChange={(event) => {
                    if (event.target.value) {
                        switchUser.mutate({
                            userId: event.target.value,
                        });
                    }
                }}
                disabled={switchUser.isPending}
            >
                <option value="" disabled>
                    Switch user…
                </option>
                {users?.map((user) => (
                    <option key={user.id} value={user.id}>
                        {user.email} ({user.role})
                    </option>
                ))}
            </select>
            {!me && users?.[0] ? (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                        switchUser.mutate({ userId: users[0].id })
                    }
                >
                    Sign in as first user
                </Button>
            ) : null}
        </div>
    );
}
