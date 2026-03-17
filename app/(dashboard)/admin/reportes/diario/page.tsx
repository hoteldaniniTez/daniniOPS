import { getDailyCorteMovements } from "@/actions";
import { auth } from "@/auth.config";
import { DailyCorteView } from "@/components";
import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ReporteDiarioPage() {
    const session = await auth();

    const rolesPermitidos = ["admin", "auxiliar_admin"];
    if (!session?.user?.role || !rolesPermitidos.includes(session.user.role)) {
        redirect("/recepcion/movimientos");
    }

    const fechaHoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

    // 2. Server Component Fetching
    const resp = await getDailyCorteMovements(fechaHoy, fechaHoy);
    if (!resp.ok) {
        return (
            <div className="md:p-8 p-4 bg-zinc-50 min-h-screen flex flex-col items-center justify-center text-center">
                <div className="bg-red-50 p-6 rounded-full mb-6">
                    <ShieldAlert size={48} className="text-red-500" />
                </div>
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase mb-2">
                    Acceso Restringido
                </h1>
                <p className="text-zinc-500 text-sm max-w-md">
                    {/* 🟢 BLINDAJE 1: Forzamos a que el mensaje sea estrictamente un String */}
                    {"No tienes los permisos necesarios para visualizar el reporte"}
                </p>
            </div>
        );
    }
    return (
        <DailyCorteView initialMovements={resp.movements} />
    );
}