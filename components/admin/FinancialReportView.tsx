"use client";

import { useState } from 'react';
import { Calendar, TrendingUp, Wallet, FileText, Scale, AlertTriangle, CheckCircle2, Search, Loader2, HotelIcon, ChefHat, LayoutTemplate, PartyPopper, ShoppingBag, BarChart3, ArrowDownCircle, Receipt } from 'lucide-react';
import { getFinancialReport } from '@/actions';
import { formatCurrency } from '@/utils';
import { toast } from "sonner";
import { KPICard, MiniCard } from '../reception/movement-ui';
import clsx from 'clsx';

export const FinancialReportView = () => {
    const hoyMexico = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

    const [range, setRange] = useState({
        inicio: hoyMexico,
        fin: hoyMexico
    });

    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        const res = await getFinancialReport({
            fechaInicio: range.inicio,
            fechaFin: range.fin
        });
        if (res.ok) setReportData(res.data);
        else toast.error(res.message || "Error al generar el reporte");
        setLoading(false);
    };

    const flujoRecaudadoReal = reportData ? (
        reportData.totalesPorMetodo.p_deposito +
        reportData.totalesPorMetodo.transferencia +
        reportData.totalesPorMetodo.T_4303851 +
        reportData.totalesPorMetodo.T_4449999
    ) : 0;

    const diferenciaFiscal = reportData ? (flujoRecaudadoReal - reportData.resumenFiscal.totalFacturado) : 0;
    const estaCuadrado = Math.abs(diferenciaFiscal) <= 1;

    const areaStyles: Record<string, string> = {
        HOTEL: "text-emerald-600 border-t-emerald-600 group-hover:bg-emerald-50",
        ANTICIPO_HOTEL: "text-cyan-600 border-t-cyan-600 group-hover:bg-cyan-50",
        RESTAURANTE: "text-rose-600 border-t-rose-600 group-hover:bg-rose-50",
        ANTICIPO_RESTAURANTE: "text-blue-600 border-t-blue-600 group-hover:bg-blue-50",
        EVENTO: "text-purple-600 border-t-purple-600 group-hover:bg-purple-50",
        RENTA_ESPACIOS: "text-yellow-600 border-t-yellow-400 group-hover:bg-yellow-50",
    };

    const defaultAreaStyle = "text-orange-600 border-t-orange-600 group-hover:bg-orange-50";

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 bg-zinc-50/50 min-h-screen pb-24 md:pb-8">

            {/* 1. HEADER & FILTROS */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
                <div className="xl:col-span-4 bg-zinc-900 p-6 md:p-8 rounded-4xl text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">
                            <TrendingUp size={16} /> Resumen De Ingresos
                        </span>
                        <h1 className="text-3xl md:text-4xl font-black italic uppercase leading-tight">
                            Reporte<br />Financiero
                        </h1>
                    </div>
                    {/* <div className="absolute -right-4 -bottom-4 opacity-4">
                        <FileText size={120} />
                    </div> */}
                </div>

                <div className="xl:col-span-8 bg-white p-6 md:p-8 rounded-4xl border border-zinc-100 shadow-xl flex flex-col md:flex-row gap-5 md:items-end justify-between">
                    <div className="flex flex-col md:flex-row gap-5 w-full">
                        <div className="space-y-2 flex-1">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Calendar size={14} /> Desde</label>
                            <input type="date" value={range.inicio} onChange={(e) => setRange({ ...range, inicio: e.target.value })} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all" />
                        </div>
                        <div className="space-y-2 flex-1">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Calendar size={14} /> Hasta</label>
                            <input type="date" min={range.inicio} value={range.fin} onChange={(e) => setRange({ ...range, fin: e.target.value })} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all" />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-5 md:mt-0">
                        <button onClick={fetchReport} disabled={loading} className="flex-1 md:flex-none px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-sm hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <><Search size={20} /> Consultar</>}
                        </button>
                        {/* <button className="p-4 bg-zinc-100 text-zinc-600 rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center" title="Exportar">
                            <Download size={20} />
                        </button> */}
                    </div>
                </div>
            </div>

            {reportData && (
                <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <KPICard title="Gran Total" amount={reportData.granTotal} icon={<Wallet size={24} />} color="bg-emerald-600" isMain={true} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {Object.entries(reportData.matrizIngresos).map(([area, valores]: any) => (
                            <MiniCard
                                key={area}
                                title={area.replace('_', ' ')}
                                amount={valores.TOTAL}
                                icon={
                                    area === "HOTEL" || area === "ANTICIPO_HOTEL"
                                        ? <HotelIcon size={14} />
                                        : area === "RESTAURANTE" || area === "ANTICIPO_RESTAURANTE"
                                            ? <ChefHat size={14} />
                                            : area === "EVENTO"
                                                ? <PartyPopper size={14} />
                                                : area === "RENTA_ESPACIOS"
                                                    ? <LayoutTemplate size={14} />
                                                    : <ShoppingBag size={14} />

                                }
                                color={
                                    area === "HOTEL"
                                        ? "text-emerald-600"
                                        : area === "ANTICIPO_HOTEL"
                                            ? "text-cyan-600"
                                            : area === "RESTAURANTE"
                                                ? "text-purple-600"
                                                : area === "ANTICIPO_RESTAURANTE"
                                                    ? "text-blue-600"
                                                    : area === "EVENTO"
                                                        ? "text-rose-500"
                                                        : area === "RENTA_ESPACIOS"
                                                            ? "text-yellow-400"
                                                            : "text-orange-600"
                                }
                            />
                        ))}
                    </div>

                    <div className="bg-white rounded-4xl shadow-xl border border-zinc-200 overflow-hidden mt-6">
                        <div className="p-5 md:p-6 bg-zinc-900 text-white border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-black uppercase italic text-sm tracking-widest flex items-center gap-3">
                                <BarChart3 size={20} className="text-emerald-400" />
                                Resumen De Ingresos
                            </h3>

                            {/* Aquí tienes el espacio libre a la derecha por si en el futuro quieres poner un botón de "Exportar a Excel" o algo similar */}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-white border-b border-zinc-200 text-zinc-900 text-[12px] lg:text-[10px] font-black uppercase tracking-widest">
                                        <th className="p-5 pl-6 sticky left-0 bg-white z-10 border-r border-zinc-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Departamento</th>
                                        <th className="p-5 text-right border-r border-zinc-100">Efectivo</th>
                                        <th className="p-5 text-right border-r border-zinc-100">P/Depósito</th>
                                        <th className="p-5 text-right border-r border-zinc-100">Transf.</th>
                                        <th className="p-5 text-right border-r border-zinc-100">T-4303851</th>
                                        <th className="p-5 text-right border-r border-zinc-100">T-4449999</th>
                                        <th className="p-5 text-right border-r border-zinc-100">Cort. H</th>
                                        <th className="p-5 text-right border-r border-zinc-100">Cort. R</th>
                                        <th className="p-5 text-right border-r border-zinc-100">Cred. F</th>

                                        <th className="p-5 pr-6 text-right bg-zinc-100 text-zinc-900">Total Depto.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {Object.entries(reportData.matrizIngresos).map(([area, valores]: any) => (
                                        <tr key={area} className="hover:bg-zinc-50/50 transition-colors group">

                                            {/* Departamento - Fijo a la izquierda en scroll */}
                                            <td
                                                className={clsx(
                                                    // Le quitamos el "flex items-center gap-3" al td
                                                    // Mantenemos el padding, el sticky y los bordes aquí
                                                    "bg-white p-4 pl-6 left-0 sticky transition-colors z-10 border-r border-zinc-100 border-t-4 align-middle",
                                                    areaStyles[area] || defaultAreaStyle
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 group-hover:bg-emerald-500 group-hover:scale-125 transition-all" />
                                                    <p className="font-mono text-sm font-bold">{area.replace('_', ' ')}</p>
                                                </div>
                                            </td>

                                            {/* 🟢 Columnas con fondo sutil y texto oscuro alineado a la derecha */}
                                            <td className={clsx(
                                                "p-4 text-right border-t-4 border-r border-zinc-100 text-zinc-500",
                                                areaStyles[area] || defaultAreaStyle
                                            )}>
                                                <p className="font-mono text-sm font-medium">{formatCurrency(valores.efectivo)}</p>
                                            </td>
                                            <td className={clsx(
                                                "p-4 text-right border-t-4 border-r border-zinc-100 text-zinc-500",
                                                areaStyles[area] || defaultAreaStyle
                                            )}>
                                                <p className="font-mono text-sm font-medium">{formatCurrency(valores.p_deposito)}</p>
                                            </td>
                                            <td className={clsx(
                                                "p-4 text-right border-t-4 border-r border-zinc-100 text-zinc-500",
                                                areaStyles[area] || defaultAreaStyle
                                            )}>
                                                <p className="font-mono text-sm font-medium">{formatCurrency(valores.transferencia)}</p>
                                            </td>
                                            <td className={clsx(
                                                "p-4 text-right border-t-4 border-r border-zinc-100 text-zinc-500",
                                                areaStyles[area] || defaultAreaStyle
                                            )}>
                                                <p className="font-mono text-sm font-medium">{formatCurrency(valores.tarjeta.terminal["T_4303851"])}</p>
                                            </td>
                                            <td className={clsx(
                                                "p-4 text-right border-t-4 border-r border-zinc-100 text-zinc-500",
                                                areaStyles[area] || defaultAreaStyle
                                            )}>
                                                <p className="font-mono text-sm font-medium">{formatCurrency(valores.tarjeta.terminal["T_4449999"])}</p>
                                            </td>
                                            <td className={clsx(
                                                "p-4 text-right border-t-4 border-r border-zinc-100 text-zinc-500",
                                                areaStyles[area] || defaultAreaStyle
                                            )}>
                                                <p className="font-mono text-sm font-medium">{formatCurrency(valores.cortesia_h)}</p>
                                            </td>
                                            <td className={clsx(
                                                "p-4 text-right border-t-4 border-r border-zinc-100 text-zinc-500",
                                                areaStyles[area] || defaultAreaStyle
                                            )}>
                                                <p className="font-mono text-sm font-medium">{formatCurrency(valores.cortesia_r)}</p>
                                            </td>
                                            <td className={clsx(
                                                "p-4 text-right border-t-4 border-r border-zinc-100 text-zinc-500",
                                                areaStyles[area] || defaultAreaStyle
                                            )}>
                                                <p className="font-mono text-sm font-medium">{formatCurrency(valores.credito_familiar)}</p>
                                            </td>

                                            <td className={clsx(
                                                "bg-zinc-100 p-4 text-right border-t-4 border-r border-zinc-100",
                                                areaStyles[area] || defaultAreaStyle
                                            )}>
                                                <p className="font-mono text-base font-black">{formatCurrency(valores.TOTAL)}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="shadow-inner">
                                    {/* Fondo ligeramente más oscuro (zinc-100) para separar el footer del resto de la tabla */}
                                    <tr className="bg-zinc-100 text-sm font-black uppercase text-zinc-800">

                                        {/* 🟢 Columna Fija (Sticky) - ¡Vital para móviles! */}
                                        <td className="p-5 pl-6 sticky left-0 z-10 bg-zinc-100 border-r border-t-2 border-zinc-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                            GRAN TOTAL
                                        </td>

                                        {/* Celdas de Totales (Limpias, sin clases redundantes) */}
                                        <td className="p-5 text-right font-mono border-r border-t-2 border-zinc-200">{formatCurrency(reportData.totalesPorMetodo.efectivo)}</td>
                                        <td className="p-5 text-right font-mono border-r border-t-2 border-zinc-200">{formatCurrency(reportData.totalesPorMetodo.p_deposito)}</td>
                                        <td className="p-5 text-right font-mono border-r border-t-2 border-zinc-200">{formatCurrency(reportData.totalesPorMetodo.transferencia)}</td>
                                        <td className="p-5 text-right font-mono border-r border-t-2 border-zinc-200">{formatCurrency(reportData.totalesPorMetodo.T_4303851)}</td>
                                        <td className="p-5 text-right font-mono border-r border-t-2 border-zinc-200">{formatCurrency(reportData.totalesPorMetodo.T_4449999)}</td>
                                        <td className="p-5 text-right font-mono border-r border-t-2 border-zinc-200 text-zinc-500">{formatCurrency(reportData.totalesPorMetodo.cortesia_h)}</td>
                                        <td className="p-5 text-right font-mono border-r border-t-2 border-zinc-200 text-zinc-500">{formatCurrency(reportData.totalesPorMetodo.cortesia_r)}</td>
                                        <td className="p-5 text-right font-mono border-r border-t-2 border-zinc-200 text-zinc-500">{formatCurrency(reportData.totalesPorMetodo.credito_familiar)}</td>

                                        {/* 🟢 Tu excelente idea del bloque verde, pero mejor integrada */}
                                        <td className="p-5 pr-6 text-right font-black font-mono bg-emerald-600 text-white text-base border-t-2 border-emerald-600">
                                            {formatCurrency(reportData.granTotal)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* 🟢 SECCIÓN DE UTILIDAD NETA (DISEÑO EXPERTO UX/UI) */}
                    <div className="bg-zinc-900 rounded-[3rem] border-4 border-white shadow-2xl overflow-hidden mt-8">
                        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">

                            {/* LADO IZQUIERDO: RESUMEN DE ENTRADA (FLUJO BRUTO) */}
                            <div className="lg:col-span-3 p-8 bg-zinc-800/30 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/10 text-center lg:text-left">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] leading-none mb-2">
                                        Ingreso Recaudado
                                    </p>
                                    <h3 className="text-2xl font-black italic text-white uppercase leading-none">
                                        Total<br />Bruto
                                    </h3>
                                </div>
                                <div className="mt-6 space-y-1">
                                    <p className="text-2xl font-mono font-black text-white/90">
                                        {formatCurrency(reportData.granTotal)}
                                    </p>
                                    {/* <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest leading-none">
                                        Vouchers + Efectivo
                                    </p> */}
                                </div>
                            </div>

                            {/* CENTRO: LA DEDUCCIÓN OPERATIVA (PROPINAS) */}
                            <div className="lg:col-span-4 p-8 flex flex-col justify-center items-center relative group">
                                {/* Divisor visual sutil */}
                                <div className="absolute inset-y-8 left-0 w-px bg-linear-to-b from-transparent via-white/10 to-transparent hidden lg:block" />

                                <div className="flex flex-col items-center text-center space-y-2">
                                    <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 mb-2">
                                        <Receipt size={24} />
                                    </div>
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                                        Fondo de Propinas
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <ArrowDownCircle size={20} className="text-rose-500 animate-bounce" />
                                        <span className="text-3xl font-mono font-black text-rose-500">
                                            -{formatCurrency((reportData.totalGeneralPropinas * 0.84))}
                                        </span>
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 py-1 px-3 bg-rose-500/10 border border-rose-500/20 rounded-full mt-2">
                                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                                            Incidencia: {(((reportData.totalGeneralPropinas * 0.84) / reportData.granTotal) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* LADO DERECHO: LA GANANCIA REAL (EL ÉXITO) */}
                            <div className="lg:col-span-5 bg-linear-to-br from-zinc-800 to-black p-8 flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />

                                <div className="relative z-10 flex flex-col space-y-6">
                                    {/* Comparativa de Márgenes */}
                                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                                                Margen Operativo
                                            </span>
                                            <p className="text-xl font-mono font-black text-emerald-400">
                                                {(((reportData.granTotal - (reportData.totalGeneralPropinas * 0.84)) / reportData.granTotal) * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                        <div className="h-8 w-px bg-white/10" />
                                        <div className="text-right space-y-1">
                                            <span className="text-[9px] font-black text-rose-500/70 uppercase tracking-widest leading-none">
                                                Margen Propinas
                                            </span>
                                            <p className="text-xl font-mono font-black text-rose-500/70">
                                                {(((reportData.totalGeneralPropinas * 0.84) / reportData.granTotal) * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* KPI Maestro: Utilidad Neta */}
                                    <div className="flex justify-between items-center bg-emerald-500/5 p-6 rounded-4xl border border-emerald-500/10 shadow-inner group hover:border-emerald-500/30 transition-all duration-500">
                                        <div className="space-y-1">
                                            <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em]">UTILIDAD NETA HOTEL</span>
                                            <h4 className="text-4xl md:text-5xl font-mono font-black text-emerald-400 leading-none">
                                                {formatCurrency(reportData.granTotal - (reportData.totalGeneralPropinas * 0.84))}
                                            </h4>
                                        </div>
                                        <div className="p-4 bg-emerald-500 rounded-3xl text-zinc-900 shadow-[0_0_30px_rgba(16,185,129,0.3)] group-hover:scale-110 transition-transform duration-500">
                                            <TrendingUp size={32} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-4xl shadow-xl border border-zinc-100 overflow-hidden">
                        <div className="p-5 md:p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                            <h3 className="font-black uppercase italic text-sm md:text-base text-zinc-900 tracking-widest flex items-center gap-2">
                                <FileText size={18} className="text-zinc-400" /> Desglose de Facturas Emitidas
                            </h3>
                        </div>
                        <div className="p-5 md:p-8 grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-10">
                            <FacturaTable title="Ingresos Generales (16%)" facturas={reportData.facturasDetalle.filter((f: any) => f.ish === 0)} />
                            <FacturaTable title="Ingresos Hospedaje (3%)" facturas={reportData.facturasDetalle.filter((f: any) => f.ish > 0)} hotel={true} />
                        </div>
                    </div>

                    <div className="bg-white rounded-4xl shadow-xl border border-zinc-100 overflow-hidden">
                        <div className="p-5 md:p-6 bg-zinc-900 text-white flex justify-between items-center">
                            <h3 className="font-black uppercase italic text-sm md:text-base tracking-widest flex items-center gap-2">
                                <Scale size={18} className="text-rose-400" /> Cuadre Financiero Facturación (Sumas Iguales)
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-100">
                            {/* Flujo Real */}
                            <div className="p-6 space-y-5 bg-zinc-50/50">
                                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-3 flex items-center justify-between">
                                    <span>Flujo Recaudado (Bancos)</span>
                                </h4>
                                <div className="space-y-3 text-sm font-bold text-zinc-600 uppercase">
                                    <div className="flex justify-between p-2.5 hover:bg-white rounded-xl transition-colors"><span>P/Depósito</span><span className="font-mono text-zinc-900 text-base">{formatCurrency(reportData.totalesPorMetodo.p_deposito)}</span></div>
                                    <div className="flex justify-between p-2.5 hover:bg-white rounded-xl transition-colors"><span>Transferencias</span><span className="font-mono text-zinc-900 text-base">{formatCurrency(reportData.totalesPorMetodo.transferencia)}</span></div>
                                    <div className="flex justify-between p-2.5 bg-blue-50/50 hover:bg-blue-100 text-blue-800 rounded-xl transition-colors border border-blue-100"><span>Tarjetas TPV</span><span className="font-mono text-base">{formatCurrency(reportData.totalesPorMetodo.T_4303851 + reportData.totalesPorMetodo.T_4449999)}</span></div>
                                </div>
                            </div>

                            {/* Fiscal */}
                            <div className="p-6 space-y-5">
                                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-3 flex items-center justify-between">
                                    <span>Desglose Facturado SAT</span>
                                </h4>
                                <div className="space-y-3 text-sm font-bold text-zinc-600 uppercase">
                                    <div className="flex justify-between p-2 hover:bg-zinc-50 rounded-xl transition-colors"><span>Hotel (Subtotal)</span><span className="font-mono text-zinc-900 text-base">{formatCurrency(reportData.resumenFiscal.subtotalHotel)}</span></div>
                                    <div className="flex justify-between p-2 hover:bg-zinc-50 rounded-xl transition-colors"><span>Rest. (Subtotal)</span><span className="font-mono text-zinc-900 text-base">{formatCurrency(reportData.resumenFiscal.subtotalRestaurante)}</span></div>
                                    {reportData.resumenFiscal.subtotalOtros > 0 && <div className="flex justify-between p-2"><span>Otros (Subtotal)</span><span className="font-mono text-zinc-900 text-base">{formatCurrency(reportData.resumenFiscal.subtotalOtros)}</span></div>}
                                    <div className="flex justify-between p-2 text-zinc-400 border-t border-dashed border-zinc-200 pt-3 mt-3"><span>I.V.A. (16%)</span><span className="font-mono text-zinc-900 text-base">{formatCurrency(reportData.resumenFiscal.iva)}</span></div>
                                    <div className="flex justify-between p-2 text-zinc-400"><span>ISH (3%)</span><span className="font-mono text-zinc-900 text-base">{formatCurrency(reportData.resumenFiscal.ish)}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Resultado del Cuadre */}
                        <div className="p-6 bg-zinc-100 flex flex-col md:flex-row justify-between items-center border-t-2 border-zinc-200 gap-6">
                            <div className="text-center md:text-left">
                                <span className="text-zinc-900 font-black uppercase text-base md:text-lg tracking-widest block">Balance Final Facturación</span>
                                {!estaCuadrado && diferenciaFiscal > 0 && (
                                    <span className="text-xs font-bold text-rose-600 uppercase flex items-center gap-1.5 justify-center md:justify-start mt-2 bg-rose-100 py-1.5 px-3 rounded-lg w-fit">
                                        <AlertTriangle size={14} /> Faltan {formatCurrency(diferenciaFiscal)}
                                    </span>
                                )}
                                {estaCuadrado && (
                                    <span className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1.5 justify-center md:justify-start mt-2 bg-emerald-100 py-1.5 px-3 rounded-lg w-fit">
                                        <CheckCircle2 size={14} /> Balance Cuadrado
                                    </span>
                                )}
                            </div>

                            <div className="flex w-full md:w-auto min-w-[320px] justify-between text-lg md:text-3xl font-black font-mono bg-white rounded-3xl border border-zinc-300 overflow-hidden shadow-inner">
                                <span className="w-1/2 p-5 text-center text-zinc-900 border-r border-zinc-200">
                                    {formatCurrency(flujoRecaudadoReal)}
                                </span>
                                <span className={`w-1/2 p-5 text-center transition-colors ${estaCuadrado ? 'text-emerald-600 bg-emerald-50/50' : 'text-rose-600 bg-rose-50/50'}`}>
                                    {formatCurrency(reportData.resumenFiscal.totalFacturado)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const FacturaTable = ({ title, facturas, hotel }: any) => {
    const totalSub = facturas.reduce((acc: number, f: any) => acc + f.subtotal, 0);
    const totalIva = facturas.reduce((acc: number, f: any) => acc + f.iva, 0);
    const totalIsh = facturas.reduce((acc: number, f: any) => acc + f.ish, 0);
    const totalGen = facturas.reduce((acc: number, f: any) => acc + f.total, 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hotel ? 'bg-purple-500' : 'bg-blue-500'}`} />
                <h4 className="text-xs md:text-sm font-black uppercase tracking-widest text-zinc-700">{title}</h4>
            </div>
            <div className="bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm font-bold uppercase min-w-125">
                        <thead>
                            <tr className="text-zinc-400 bg-zinc-50 border-b border-zinc-200">
                                <th className="sticky bg-zinc-50 p-4 md:p-5 text-center left-0">Folio SAT</th>
                                <th className="p-4 md:p-5 text-center">Subtotal</th>
                                <th className="p-4 md:p-5 text-center text-blue-700">IVA</th>
                                {hotel && <th className="p-4 md:p-5 text-center text-purple-600">ISH</th>}
                                <th className="p-4 md:p-5 text-center text-emerald-700">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-sm">
                            {facturas.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-zinc-400 italic lowercase text-base">No hay facturas en este periodo</td></tr>
                            ) : (
                                facturas.map((f: any) => (
                                    <tr key={f.id} className="text-zinc-600 hover:bg-zinc-50 transition-colors">
                                        <td className="sticky left-0 bg-white p-4 md:p-5 font-mono text-zinc-900">{f.folio}</td>
                                        <td className="p-4 md:p-5 text-right font-mono">{formatCurrency(f.subtotal)}</td>
                                        <td className="p-4 md:p-5 text-right font-mono text-blue-700">{formatCurrency(f.iva)}</td>
                                        {hotel && <td className="p-4 md:p-5 text-right font-mono text-purple-600">{formatCurrency(f.ish)}</td>}
                                        <td className="p-4 md:p-5 text-right font-black text-emerald-600 text-base">{formatCurrency(f.total)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {facturas.length > 0 && (
                            <tfoot>
                                <tr className="border-t-2 border-zinc-300 text-zinc-900 bg-zinc-100/50 text-sm">
                                    <td className="sticky left-0 bg-zinc-50 p-4 md:p-5 font-black">TOTAL</td>
                                    <td className="p-4 md:p-5 text-right font-mono font-black">{formatCurrency(totalSub)}</td>
                                    <td className="p-4 md:p-5 text-right font-mono font-black text-blue-700">{formatCurrency(totalIva)}</td>
                                    {hotel && <td className="p-4 md:p-5 text-right font-mono font-black text-purple-700">{formatCurrency(totalIsh)}</td>}
                                    <td className="p-4 md:p-5 text-right font-mono font-black text-emerald-700 text-base">{formatCurrency(totalGen)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};