import { auth } from "@/auth.config";
import { MonthlyReportView } from "@/components";
import { redirect } from "next/navigation";

export default async function ReporteMensualPage() {
    const session = await auth();

    const rolesPermitidos = ["admin", "auxiliar_admin"];
    if (!session?.user?.role || !rolesPermitidos.includes(session.user.role)) {
        redirect("/recepcion/movimientos");
    }

    return (
        <MonthlyReportView />
    );
}