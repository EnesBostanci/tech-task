export type UserRole = "admin" | "creator";

export function homePathForRole(role: UserRole) {
    return role === "admin" ? "/admin/campaigns" : "/campaigns";
}

export function requiredRoleForPath(pathname: string): UserRole | null {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        return "admin";
    }

    if (
        pathname === "/campaigns" ||
        pathname.startsWith("/campaigns/") ||
        pathname === "/submissions" ||
        pathname.startsWith("/submissions/")
    ) {
        return "creator";
    }

    return null;
}
