"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus2, FileX2 } from "lucide-react";
import clsx from "clsx";

export default function FacturasLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const tabs = [
        { name: "Asignar Facturas", href: "/recepcion/facturas/asignar", icon: <FilePlus2 size={16} /> },
        { name: "Eliminar Facturas", href: "/recepcion/facturas/eliminar", icon: <FileX2 size={16} /> },
    ];

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">

            {/* ENCABEZADO DE MÓDULO */}
            <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-black text-zinc-900 italic uppercase tracking-tight">
                    Control de Facturación
                </h1>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">
                    Gestión de Comprobantes Fiscales
                </p>
            </div>

            {/* MENÚ DE NAVEGACIÓN (TABS) - VERSIÓN PREMIUM STICKY */}
            <div className="sticky top-4 z-40 w-full overflow-x-auto pb-2 -mb-2 hide-scrollbar">
                <div className="inline-flex p-1.5 bg-white/80 backdrop-blur-md border border-zinc-200 shadow-sm rounded-[1.25rem]">
                    {tabs.map((tab) => {
                        const isActive = pathname.includes(tab.href);
                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className={clsx(
                                    "relative flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 whitespace-nowrap",
                                    isActive
                                        ? "bg-zinc-900 text-white shadow-md scale-100"
                                        : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50 scale-[0.98] hover:scale-100"
                                )}
                            >
                                <span className={clsx(
                                    "transition-colors duration-300",
                                    isActive ? "text-emerald-400" : "text-zinc-400"
                                )}>
                                    {tab.icon}
                                </span>
                                {tab.name}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* CONTENIDO DINÁMICO (Aquí se inyectan las páginas de Asignar/Eliminar) */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
            </div>
        </div>
    );
}