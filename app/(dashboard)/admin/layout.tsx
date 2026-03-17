// app/admin/layout.tsx
import { auth } from "@/auth.config";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session?.user?.id) redirect("/auth/login");

    const rolesPermitidos = ["admin", "auxiliar_admin"];
    if (!rolesPermitidos.includes(session.user.role)) {
        redirect("/recepcion/movimientos");
    }

    // Si es admin o auxiliar, pasa a las subcarpetas
    return <>{children}</>;
}