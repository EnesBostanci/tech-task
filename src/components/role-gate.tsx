"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { homePathForRole, requiredRoleForPath } from "@/lib/roles";
import { trpc } from "@/trpc/client";

export function RoleGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { data: me, isLoading } = trpc.user.me.useQuery();
    const required = requiredRoleForPath(pathname);
    const mismatch =
        Boolean(required) &&
        !isLoading &&
        (!me || me.role !== required);

    useEffect(() => {
        if (!mismatch) {
            return;
        }

        router.replace(me ? homePathForRole(me.role) : "/");
    }, [me, mismatch, router]);

    if (mismatch) {
        return <p className="text-muted-foreground">Redirecting…</p>;
    }

    return children;
}
