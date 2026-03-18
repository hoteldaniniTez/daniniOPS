import { auth } from "@/auth.config";
import { Navbar, ScreenshotButton, Sidebar } from "@/components";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";

export default async function DashboardLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session?.user || !session?.user.active) {
        redirect("/auth/login?redirectTo=/recepcion/movimientos");
    }

    return (
        <main className="min-h-screen">
            <Navbar />
            <Sidebar />
            <ScreenshotButton />

            <div id="main-content" className="pt-20 lg:pt-24 px-2 sm:px-6 lg:px-2">
                {children}
                <Toaster position="top-right" richColors closeButton />
            </div>
        </main>
    );
}