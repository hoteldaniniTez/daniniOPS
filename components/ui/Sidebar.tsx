"use client";

import { logout } from "@/actions";
import { useNavStore } from "@/store/useNavStore";
import { X, LogOut, LayoutDashboard, FileText, Users, CreditCard, MoveHorizontal, Banknote, User, Calculator, File } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// 1. Mapeo de nombres amigables para los roles
const ROLE_LABELS: Record<string, string> = {
    admin: "Administrador",
    auxiliar_admin: "Auxiliar administrativo",
    recepcionista: "Recepcionista",
};

export const Sidebar = () => {
    const { isSidebarOpen, closeSidebar } = useNavStore();
    const pathname = usePathname();
    const { data: session } = useSession();

    const isAuthenticated = !!session?.user;
    const userRole = session?.user.role; // 'admin', 'recepcionista' o 'auxiliar_admin'

    const navItems = [
        { name: 'Perfil', href: '/perfil', icon: User, roles: ['admin', 'recepcionista', 'auxiliar_admin'] },
        { name: 'Registrar Movimiento', href: '/recepcion/movimientos', icon: MoveHorizontal, roles: ['admin', 'recepcionista', 'auxiliar_admin'] },
        { name: 'Corte', href: '/recepcion/corte', icon: Calculator, roles: ['admin', 'recepcionista', 'auxiliar_admin'] },
        { name: 'Créditos por Cobrar', href: '/recepcion/creditos-por-cobrar', icon: CreditCard, roles: ['admin', 'recepcionista', 'auxiliar_admin'] },
        { name: 'Facturas', href: '/recepcion/facturas', icon: File, roles: ['admin', 'recepcionista', 'auxiliar_admin'] },
        { name: 'Reportes', href: '/admin/reportes', icon: LayoutDashboard, roles: ['admin', 'auxiliar_admin', 'recepcionista'] },
        { name: 'Propinas', href: '/admin/propinas', icon: Banknote, roles: ['admin', 'auxiliar_admin'] },
        { name: 'Auditoría', href: '/admin/auditoria', icon: FileText, roles: ['admin'] },
        { name: 'Usuarios', href: '/admin/usuarios', icon: Users, roles: ['admin'] },
    ];

    const onLogout = async () => {
        await logout();
        closeSidebar();
    }

    return (
        <>
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-60 animate-in fade-in duration-300" onClick={closeSidebar} />
            )}

            <aside className={`fixed top-0 right-0 h-full w-80 bg-white z-70 transform transition-transform duration-500 ease-in-out border-l border-zinc-100 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>
                {/* Cambiamos p-8 por un padding más estratégico para el scroll */}
                <div className="flex flex-col h-full">

                    {/* 1. Header: Fijo arriba (agregamos p-8 aquí) */}
                    <div className="flex justify-between items-center p-8 pb-4 flex-none">
                        <div className="flex flex-col">
                            <span className="font-black tracking-[0.2em] uppercase text-[10px] text-zinc-400">Menú Operativo</span>
                            <span className="text-[9px] font-bold text-emerald-600 uppercase italic">
                                {isAuthenticated && userRole ? (ROLE_LABELS[userRole] || "Invitado") : "No role"}
                            </span>
                        </div>
                        <button onClick={closeSidebar} className="p-2.5 bg-zinc-50 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all cursor-pointer">
                            <X size={20} />
                        </button>
                    </div>

                    {/* 2. Navegación: Área con SCROLL (La clave está en overflow-y-auto) */}
                    <nav className="flex-1 overflow-y-auto px-8 py-4 space-y-2 scrollbar-thin scrollbar-thumb-zinc-200">
                        {navItems.map((link) => {
                            if (!isAuthenticated || !link.roles.includes(userRole as string)) return null;
                            const isActive = pathname === link.href;

                            return (
                                <div key={link.href}>
                                    {link.name === 'Reportes' && userRole === 'admin' && (
                                        <div className="w-full h-px bg-zinc-100 my-4" />
                                    )}
                                    <Link
                                        href={link.href}
                                        onClick={closeSidebar}
                                        className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${isActive
                                            ? 'bg-zinc-900 text-white shadow-xl shadow-zinc-200'
                                            : 'hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900'
                                            }`}
                                    >
                                        <link.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                        <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
                                            {link.name}
                                        </span>
                                    </Link>
                                </div>
                            );
                        })}
                    </nav>

                    {/* 3. Footer: Botón de Cerrar Sesión (Fijo abajo con flex-none) */}
                    {isAuthenticated && (
                        <div className="p-8 border-t border-zinc-100 flex-none bg-white">
                            <button
                                onClick={onLogout}
                                className="cursor-pointer flex items-center gap-4 w-full p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold text-sm uppercase tracking-widest"
                            >
                                <LogOut size={20} />
                                <span>Cerrar Sesión</span>
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}