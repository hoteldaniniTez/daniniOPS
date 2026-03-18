import Link from 'next/link';
import { CalendarDays, BarChart3, FileText, ArrowRight, TrendingUp } from 'lucide-react';
import { auth } from '@/auth.config';
import { redirect } from 'next/navigation';

export default async function ReportesPage() {
    const session = await auth();

    const rol = session?.user.role;
    if (!session?.user || !session?.user.active) {
        redirect("/recepcion/movimientos");
    }

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500">
            {/* HEADER DEL HUB */}
            <div className="bg-zinc-900 p-8 md:p-10 rounded-[3rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-3">
                        <TrendingUp size={16} /> Centro de Inteligencia
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-tight">
                        Control<br />Financiero
                    </h1>
                    <p className="text-zinc-400 mt-4 max-w-lg text-sm font-medium">
                        Selecciona el módulo de auditoría que deseas consultar. Todos los reportes están sincronizados en tiempo real con la facturación y recepción del hotel.
                    </p>
                </div>
            </div>

            {/* GRID DE MÓDULOS DE REPORTES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* TARJETA 1: CORTE DIARIO */}
                <Link href="/admin/reportes/diario" className="group block">
                    <div className="bg-white p-8 rounded-4xl border-2 border-zinc-100 shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
                        <div className="p-4 bg-zinc-50 rounded-2xl w-fit text-zinc-900 mb-6 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                            <CalendarDays size={28} />
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 uppercase tracking-wide mb-2">Corte Diario</h3>
                        <p className="text-xs text-zinc-500 font-medium leading-relaxed mb-8 flex-1">
                            Auditoría de caja por turno, desglose de ingresos en efectivo, tarjetas y cálculo de propinas dispersadas.
                        </p>
                        <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-emerald-600 transition-colors">
                            Acceder al módulo <ArrowRight size={14} className="ml-2 group-hover:translate-x-2 transition-transform" />
                        </div>
                    </div>
                </Link>

                {/* TARJETA 2: REPORTE MENSUAL */}
                {
                    rol != "recepcionista" && (
                        <>
                            <Link href="/admin/reportes/mensual" className="group block">
                                <div className="bg-white p-8 rounded-4xl border-2 border-zinc-100 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
                                    <div className="p-4 bg-zinc-50 rounded-2xl w-fit text-zinc-900 mb-6 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <BarChart3 size={28} />
                                    </div>
                                    <h3 className="text-xl font-black text-zinc-900 uppercase tracking-wide mb-2">Reportes Mensuales</h3>
                                    <p className="text-xs text-zinc-500 font-medium leading-relaxed mb-8 flex-1">
                                        Comparativa general de ingresos, rentabilidad neta por area y/o suma total de areas.
                                    </p>
                                    <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-blue-600 transition-colors">
                                        Acceder al módulo <ArrowRight size={14} className="ml-2 group-hover:translate-x-2 transition-transform" />
                                    </div>
                                </div>
                            </Link>

                            {/* TARJETA 3: FACTURACIÓN / CFDI (Opcional para el futuro) */}
                            <Link href="/admin/reportes/financiero" className="group block">
                                <div className="bg-white p-8 rounded-4xl border-2 border-zinc-100 shadow-sm hover:shadow-xl hover:border-purple-500/30 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
                                    <div className="p-4 bg-zinc-50 rounded-2xl w-fit text-zinc-900 mb-6 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                        <FileText size={28} />
                                    </div>
                                    <h3 className="text-xl font-black text-zinc-900 uppercase tracking-wide mb-2">Reporte Financiero</h3>
                                    <p className="text-xs text-zinc-500 font-medium leading-relaxed mb-8 flex-1">
                                        Resumen impositivo, desglose de I.V.A., I.S.H. y conciliación directa con los comprobantes emitidos.
                                    </p>
                                    <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-purple-600 transition-colors">
                                        Acceder al módulo <ArrowRight size={14} className="ml-2 group-hover:translate-x-2 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        </>
                    )
                }


            </div>
        </div>
    );
}