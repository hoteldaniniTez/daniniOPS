
import { redirect } from "next/navigation";
import { auth } from "@/auth.config";
import { ProfileView } from "@/components";

export default async function PerfilPage() {
    const session = await auth();

    // Si no hay sesión, protegemos la ruta enviando al login
    if (!session?.user) {
        // redirect("/auth/login?returnTo=/perfil");
        redirect("/auth/login");
    }

    return (
        <div className="p-4 lg:p-12 bg-zinc-50 min-h-screen">
            <header className="mb-10">
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Mi Perfil</h1>
            </header>
            <ProfileView user={session.user} />
        </div>
    );
}