'use server';
import { signOut, auth } from "@/auth.config";

export const logout = async () => {
    // 1. Opcional: Verificar si hay sesión antes de intentar el logout
    const session = await auth();

    if (!session) return; // Si no hay sesión, no hacemos nada

    // 2. Ejecutar el cierre de sesión
    await signOut({
        redirectTo: '/',
        redirect: true
    });
}