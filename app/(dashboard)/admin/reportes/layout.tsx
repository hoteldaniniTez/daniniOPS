"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, BarChart3, Landmark } from "lucide-react";
import clsx from "clsx";

export default function ReportesLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const tabs = [
        { name: "Cortes Diarios", href: "/admin/reportes/diario", icon: <CalendarDays size={16} /> },
        { name: "Reportes Mensuales", href: "/admin/reportes/mensual", icon: <BarChart3 size={16} /> },
        { name: "Reporte Financiero", href: "/admin/reportes/financiero", icon: <Landmark size={16} /> },
    ];

    // 🟢 Evaluamos si estamos exactamente en la raíz del módulo de reportes (El Hub)
    const isHubPage = pathname === "/admin/reportes";

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">

            {/* 🟢 CONDICIONAL: Solo mostramos las pestañas si NO estamos en el Hub */}
            {!isHubPage && (
                <div className="w-full overflow-x-auto pb-2 -mb-2 hide-scrollbar">
                    <div className="inline-flex p-1.5 bg-white border border-zinc-200 shadow-sm rounded-[1.25rem]">
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
                                    {/* El ícono cambia a verde esmeralda cuando está activo */}
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
            )}

            {/* CONTENIDO DINÁMICO (Aquí se inyectan las páginas) */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
            </div>
        </div>
    );
}