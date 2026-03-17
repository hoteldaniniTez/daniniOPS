import { getUsers } from "@/actions";
import { auth } from "@/auth.config";
import { UsuariosView } from "@/components";
import { AlertTriangle } from "lucide-react"; // 🟢 Cambiado para errores de sistema
import { redirect } from "next/navigation";

export default async function UsuariosPage() {
    const session = await auth();

    // 1. Candado estricto: Solo el Admin entra a gestionar usuarios
    if (!session?.user?.role || session.user.role !== "admin") {
        redirect("/recepcion/movimientos");
    }

    // 2. Fetching
    const resp = await getUsers();

    // 🟢 3. Manejo de Errores (A este punto, ya sabemos que SÍ es admin)
    if (!resp.ok || !resp.users) {
        return (
            <div className="md:p-8 p-4 bg-zinc-50 min-h-screen flex flex-col items-center justify-center text-center">
                <div className="bg-red-50 p-6 rounded-full mb-6">
                    <AlertTriangle size={48} className="text-red-500" />
                </div>
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase mb-2">
                    Error de Sistema
                </h1>
                <p className="text-zinc-500 text-sm max-w-md">
                    {/* 🟢 BLINDAJE: Evitamos el error Type '{}' is not assignable to type 'ReactNode' */}
                    {String(resp.message || "Ocurrió un error interno al consultar la base de datos de usuarios.")}
                </p>
            </div>
        );
    }

    // 4. Renderizado exitoso
    return (
        <div className="md:p-8 p-4 bg-zinc-50 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Gestión de Usuarios</h1>
                <p className="text-zinc-500 text-sm">Administra los accesos y roles del personal del Hotel y Restaurante.</p>
            </header>

            <UsuariosView users={resp.users} />
        </div>
    );
}