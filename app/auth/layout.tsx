import { auth } from "@/auth.config";
import { redirect } from "next/navigation";


export default async function AuthLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (session?.user) {
        redirect('/recepcion/movimientos')
    }
    return (
        <main className="min-h-screen bg-white font-sans">
            {children}
        </main>
    );
}