import { getPropinasReport } from "@/actions";
import { auth } from "@/auth.config";
import { Pagination, PropinasClientView } from "@/components";
import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

interface Props {
    searchParams: Promise<{
        mesero?: string;
        inicio?: string;
        fin?: string;
        page?: string;
    }>
}

export default async function PropinasPage({ searchParams }: Props) {

    const session = await auth();

    // 1. VALIDACIÓN DE ROLES
    const rolesPermitidos = ["admin", "auxiliar_admin"];
    if (!session?.user?.role || !rolesPermitidos.includes(session.user.role)) {
        redirect("/admin/reportes");
    }

    const params = await searchParams;
    const page = params.page ? parseInt(params.page) : 1;

    // 🟢 2. CÁLCULO DE FECHA POR DEFECTO (MÉXICO)
    // Esto garantiza que si la URL no tiene fechas, usemos "Hoy" para la consulta inicial
    const hoyMexico = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

    // 🟢 3. ASIGNACIÓN DE PARÁMETROS
    // Si 'inicio' o 'fin' no vienen en la URL, forzamos que sean la fecha de hoy
    const mesero = params.mesero || 'todos';
    const inicio = params.inicio || hoyMexico;
    const fin = params.fin || hoyMexico;

    // 4. LLAMADA AL ACTION CON LAS FECHAS YA NORMALIZADAS
    const resp = await getPropinasReport({
        mesero,
        fechaInicio: inicio,
        fechaFin: fin,
        page: page
    });

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
                    {String(resp.message || "No tienes los permisos necesarios para visualizar el reporte de propinas.")}
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <header className="space-y-1">
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight italic uppercase leading-none">
                    Reporte de Propinas
                </h1>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                    Restaurante Danini • Control de dispersión
                </p>
            </header>

            {/* Pasamos los datos al componente cliente */}
            <PropinasClientView
                movements={resp.movements}
                currentMesero={mesero}
                currentInicio={inicio}
                currentFin={fin}
                granTotal={resp.granTotalPeriodo}
            />

            {/* Paginación blindada */}
            {resp.totalPages > 1 ? (
                <div className="pt-4 border-t border-zinc-100">
                    <Pagination totalPages={resp.totalPages} />
                </div>
            ) : null}

        </div>
    );
}