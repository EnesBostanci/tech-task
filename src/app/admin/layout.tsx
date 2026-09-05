import { requireRole } from "@/server/require-role";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireRole("admin");
    return children;
}
