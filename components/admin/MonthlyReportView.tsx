"use client";

import { useState } from 'react';
import { CalendarDays, Search, Download, Loader2, Receipt } from 'lucide-react';
import { getMonthlyFinancialReport } from '@/actions';
import { formatCurrency } from '@/utils';
import { toast } from "sonner";
import { DailyTrendChart } from './graficas/DailyTrendChart';
import { MonthlyComparisonChart } from './graficas/MonthlyComparisonChart';
import { PaymentMethodDonutChart } from './graficas/PaymentMethodDonutChart';

export const MonthlyReportView = () => {
    // Inicializar con el mes actual (YYYY-MM)
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [filtros, setFiltros] = useState({
        mesInicio: currentMonth,
        mesFin: currentMonth,
        area: "TODAS"
    });

    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Opciones agrupadas y limpias (UX)
    const areasDisponibles = ["HOTEL", "RESTAURANTE", "EVENTO", "RENTA_ESPACIOS", "SOUVENIR"];

    const fetchReport = async () => {
        if (filtros.mesInicio > filtros.mesFin) {
            toast.error("El mes de inicio no puede ser mayor al mes de fin");
            return;
        }

        setLoading(true);
        const res = await getMonthlyFinancialReport({
            mesInicio: filtros.mesInicio,
            mesFin: filtros.mesFin,
            area: filtros.area
        });
        if (res.ok) setReportData(res.data);
        else toast.error(res.message || "Error al generar el reporte");
        setLoading(false);
    };

    const calcPorcentaje = (monto: number, total: number) => {
        if (total === 0) return "0%";
        return `${((monto / total) * 100).toFixed(2)}%`;
    };

    // Función para mostrar la fecha de forma bonita (ej. "01 Ene 26")
    const formatRowDate = (dateString: string) => {
        const date = new Date(dateString + 'T12:00:00Z'); // Forzamos mediodía para evitar saltos de zona horaria
        return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '');
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 bg-zinc-50/50 min-h-screen pb-24 md:pb-8">

            {/* HEADER & FILTROS */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
                <div className="xl:col-span-4 bg-zinc-900 p-6 md:p-8 rounded-4xl text-white flex flex-col justify-between shadow-xl">
                    <div>
                        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">
                            <CalendarDays size={16} /> Concentrado Financiero Por Áreas
                        </span>
                        <h1 className="text-3xl md:text-4xl font-black italic uppercase leading-tight">
                            Reporte<br />Mensual
                        </h1>
                    </div>
                </div>

                <div className="xl:col-span-8 bg-white p-6 md:p-8 rounded-4xl border border-zinc-100 shadow-xl flex flex-col md:flex-row gap-5 md:items-end justify-between">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Desde (Mes)</label>
                            {/* 🟢 UX: input type="month" es nativo y evita errores de fechas sueltas */}
                            <input
                                type="month"
                                value={filtros.mesInicio}
                                onChange={(e) => setFiltros({ ...filtros, mesInicio: e.target.value })}
                                className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all cursor-pointer"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Hasta (Mes)</label>
                            <input
                                min={filtros.mesInicio}
                                type="month"
                                value={filtros.mesFin}
                                onChange={(e) => setFiltros({ ...filtros, mesFin: e.target.value })}
                                className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all cursor-pointer"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Área</label>
                            <select
                                value={filtros.area}
                                onChange={(e) => setFiltros({ ...filtros, area: e.target.value })}
                                className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all cursor-pointer"
                            >
                                <option value="TODAS">TODAS LAS ÁREAS</option>
                                {/* 🟢 Limpiamos las opciones para no mostrar los anticipos al usuario */}
                                {areasDisponibles.map(area => (
                                    <option key={area} value={area}>{area.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex md:pt-6 gap-3 mt-5 md:mt-0">
                            <button onClick={fetchReport} disabled={loading} className="w-full h-12.5 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-sm hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Search size={20} /> Filtrar</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLA TIPO SÁBANA */}
            {reportData && (
                <>
                    <div className="bg-white rounded-4xl shadow-xl border border-zinc-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">

                        <div className="p-5 md:p-6 bg-zinc-900 text-white border-b border-white/10 flex flex-col items-center justify-center text-center">
                            <h2 className="font-black text-xl uppercase tracking-widest">{filtros.area === "TODAS" ? "REPORTE GENERAL" : filtros.area.replace('_', ' ')}</h2>
                            <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-sm mt-1">
                                {filtros.mesInicio === filtros.mesFin
                                    ? `Periodo: ${filtros.mesInicio}`
                                    : `De ${filtros.mesInicio} a ${filtros.mesFin}`}
                            </h3>
                        </div>

                        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead className="sticky top-0 z-20 shadow-md">
                                    <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                                        <th className="p-4 pl-6 sticky left-0 bg-zinc-100 z-30 border-r border-zinc-200">Fecha</th>
                                        <th className="p-4 text-right border-r border-zinc-200">Efectivo</th>
                                        <th className="p-4 text-right border-r border-zinc-200">P/Depósito</th>
                                        <th className="p-4 text-right border-r border-zinc-200">Transf.</th>
                                        <th className="p-4 text-right border-r border-zinc-200">T-4303851</th>
                                        <th className="p-4 text-right border-r border-zinc-200">T-4449999</th>
                                        <th className="p-4 text-right border-r border-zinc-200">Cort. H</th>
                                        <th className="p-4 text-right border-r border-zinc-200">Cort. R</th>
                                        <th className="p-4 text-right border-r border-zinc-200">Cred. F</th>
                                        <th className="p-4 pr-6 text-right bg-zinc-200 text-zinc-900 border-l-2 border-zinc-300">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {reportData.reportePorDia.map((dia: any) => (
                                        <tr key={dia.fecha} className="hover:bg-zinc-50 transition-colors group">
                                            <td className="p-3 pl-6 sticky left-0 bg-white group-hover:bg-zinc-50 z-10 border-r border-zinc-100 font-bold text-zinc-700 text-center uppercase text-xs">
                                                {formatRowDate(dia.fecha)}
                                            </td>
                                            <td className="p-3 text-right font-mono text-sm text-zinc-600 border-r border-zinc-50">{dia.efectivo > 0 ? formatCurrency(dia.efectivo) : "-"}</td>
                                            <td className="p-3 text-right font-mono text-sm text-zinc-600 border-r border-zinc-50">{dia.p_deposito > 0 ? formatCurrency(dia.p_deposito) : "-"}</td>
                                            <td className="p-3 text-right font-mono text-sm text-zinc-600 border-r border-zinc-50">{dia.transferencia > 0 ? formatCurrency(dia.transferencia) : "-"}</td>
                                            <td className="p-3 text-right font-mono text-sm text-zinc-600 border-r border-zinc-50">{dia.T_4303851 > 0 ? formatCurrency(dia.T_4303851) : "-"}</td>
                                            <td className="p-3 text-right font-mono text-sm text-zinc-600 border-r border-zinc-50">{dia.T_4449999 > 0 ? formatCurrency(dia.T_4449999) : "-"}</td>
                                            <td className="p-3 text-right font-mono text-sm text-zinc-400 border-r border-zinc-50">{dia.cortesia_h > 0 ? formatCurrency(dia.cortesia_h) : "-"}</td>
                                            <td className="p-3 text-right font-mono text-sm text-zinc-400 border-r border-zinc-50">{dia.cortesia_r > 0 ? formatCurrency(dia.cortesia_r) : "-"}</td>
                                            <td className="p-3 text-right font-mono text-sm text-zinc-400 border-r border-zinc-50">{dia.credito_familiar > 0 ? formatCurrency(dia.credito_familiar) : "-"}</td>
                                            <td className="p-3 pr-6 text-right font-mono text-sm font-black text-zinc-900 bg-zinc-50/50 border-l-2 border-zinc-100">
                                                {dia.TOTAL > 0 ? formatCurrency(dia.TOTAL) : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                    <tr className="bg-zinc-100 text-sm font-black text-zinc-900 border-t-2 border-zinc-300">
                                        <td className="p-4 pl-6 sticky left-0 bg-zinc-100 z-30 border-r border-zinc-200">TOTAL</td>
                                        <td className="p-4 text-right font-mono border-r border-zinc-200">{formatCurrency(reportData.totalesRango.efectivo)}</td>
                                        <td className="p-4 text-right font-mono border-r border-zinc-200">{formatCurrency(reportData.totalesRango.p_deposito)}</td>
                                        <td className="p-4 text-right font-mono border-r border-zinc-200">{formatCurrency(reportData.totalesRango.transferencia)}</td>
                                        <td className="p-4 text-right font-mono border-r border-zinc-200">{formatCurrency(reportData.totalesRango.T_4303851)}</td>
                                        <td className="p-4 text-right font-mono border-r border-zinc-200">{formatCurrency(reportData.totalesRango.T_4449999)}</td>
                                        <td className="p-4 text-right font-mono border-r border-zinc-200 text-zinc-500">{formatCurrency(reportData.totalesRango.cortesia_h)}</td>
                                        <td className="p-4 text-right font-mono border-r border-zinc-200 text-zinc-500">{formatCurrency(reportData.totalesRango.cortesia_r)}</td>
                                        <td className="p-4 text-right font-mono border-r border-zinc-200 text-zinc-500">{formatCurrency(reportData.totalesRango.credito_familiar)}</td>
                                        <td className="p-4 pr-6 text-right font-mono text-base bg-emerald-600 text-white border-l-2 border-emerald-700">
                                            {formatCurrency(reportData.totalesRango.TOTAL)}
                                        </td>
                                    </tr>
                                    <tr className="bg-zinc-50 text-[11px] font-black text-zinc-500 border-t border-zinc-200">
                                        <td className="p-2 pl-6 sticky left-0 bg-zinc-50 z-30 border-r border-zinc-200 text-center">%</td>
                                        <td className="p-2 text-right border-r border-zinc-200">{calcPorcentaje(reportData.totalesRango.efectivo, reportData.totalesRango.TOTAL)}</td>
                                        <td className="p-2 text-right border-r border-zinc-200">{calcPorcentaje(reportData.totalesRango.p_deposito, reportData.totalesRango.TOTAL)}</td>
                                        <td className="p-2 text-right border-r border-zinc-200">{calcPorcentaje(reportData.totalesRango.transferencia, reportData.totalesRango.TOTAL)}</td>
                                        <td className="p-2 text-right border-r border-zinc-200">{calcPorcentaje(reportData.totalesRango.T_4303851, reportData.totalesRango.TOTAL)}</td>
                                        <td className="p-2 text-right border-r border-zinc-200">{calcPorcentaje(reportData.totalesRango.T_4449999, reportData.totalesRango.TOTAL)}</td>
                                        <td className="p-2 text-right border-r border-zinc-200">{calcPorcentaje(reportData.totalesRango.cortesia_h, reportData.totalesRango.TOTAL)}</td>
                                        <td className="p-2 text-right border-r border-zinc-200">{calcPorcentaje(reportData.totalesRango.cortesia_r, reportData.totalesRango.TOTAL)}</td>
                                        <td className="p-2 text-right border-r border-zinc-200">{calcPorcentaje(reportData.totalesRango.credito_familiar, reportData.totalesRango.TOTAL)}</td>
                                        <td className="p-2 pr-6 text-right bg-emerald-50 text-emerald-700">100%</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    {/* 🟢 SECCIÓN DE CUADRE DE UTILIDAD REAL */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        <div className="md:col-span-2 bg-white p-8 rounded-4xl border border-zinc-100 shadow-xl space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                                <Receipt size={16} /> Resumen de Flujo vs. Utilidad
                            </h3>

                            <div className="space-y-4">
                                {/* Ingreso Bruto (Lo que entró al banco) */}
                                <div className="flex justify-between items-center pb-2 border-b border-zinc-50">
                                    <span className="text-sm font-bold text-zinc-600">Ingreso Bruto Recaudado (Vouchers + Efectivo)</span>
                                    <span className="font-mono text-lg font-black text-zinc-900">
                                        {formatCurrency(reportData.totalesRango.TOTAL)}
                                    </span>
                                </div>

                                {/* Gasto Propina (Lo que se entrega al personal) */}
                                <div className="flex justify-between items-center pb-2 border-b border-zinc-50">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-rose-600 italic">(-) Gasto por Dispersión de Propinas</span>
                                        <span className="text-[10px] text-zinc-400 uppercase font-bold">Monto facturado no perteneciente al hotel</span>
                                    </div>
                                    <span className="font-mono text-lg font-black text-rose-600">
                                        - {formatCurrency(reportData.totalesRango.propinas)}
                                    </span>
                                </div>

                                {/* Utilidad Real (El Neto) */}
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-base font-black uppercase tracking-tight text-zinc-900">Utilidad Operativa Real (Ingreso Neto)</span>
                                    <div className="text-right">
                                        <span className="font-mono text-2xl font-black text-emerald-600">
                                            {formatCurrency(reportData.totalesRango.TOTAL - (reportData.totalesRango.propinas))}
                                        </span>
                                        <p className="text-[9px] font-black text-emerald-600/50 uppercase tracking-widest leading-none">Monto libre de propinas</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mini Card de Info Rápida */}
                        <div className="bg-zinc-900 p-8 rounded-4xl text-white flex flex-col justify-center items-center text-center space-y-2 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Promedio de Propina</span>
                            <h4 className="text-4xl font-black italic text-emerald-400">
                                {calcPorcentaje((reportData.totalesRango.propinas), reportData.totalesRango.TOTAL)}
                            </h4>
                            <p className="text-[9px] font-bold text-zinc-400 leading-tight">Sobre el volumen total del periodo seleccionado</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* La gráfica diaria ocupa 2 de las 3 columnas en pantallas grandes */}
                        <div className="lg:col-span-2">
                            <DailyTrendChart data={reportData.reportePorDia} />
                        </div>

                        <div className="lg:col-span-1">
                            {/* Usamos la Dona como resumen principal del periodo */}
                            <PaymentMethodDonutChart totales={reportData.totalesRango} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1">
                        <MonthlyComparisonChart data={reportData.reportePorDia} />
                    </div>
                </>
            )}
        </div >
    );
};