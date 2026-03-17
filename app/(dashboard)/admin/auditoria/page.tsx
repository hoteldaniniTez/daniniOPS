import { auth } from "@/auth.config";
import { AuditLogView } from "@/components";
import { redirect } from "next/navigation";

export default async function AuditoriaPage() {
    const session = await auth();

    if (!session?.user?.role || session.user.role !== "admin") {
        redirect("/recepcion/movimientos");
    }
    return (
        <AuditLogView />
    );
}