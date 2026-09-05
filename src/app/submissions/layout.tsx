import { requireRole } from "@/server/require-role";

export default async function CreatorSubmissionsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireRole("creator");
    return children;
}
