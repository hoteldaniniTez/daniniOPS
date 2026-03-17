"use client";

import { useState, useEffect } from 'react';
import {
    Search, ShieldAlert, FileJson, X, User, Edit3, Trash2, PlusCircle, LogIn,
    Loader2, Hash,
    AlertCircle,
    ArrowRightLeft,
    FileText,
    Wallet,
    CreditCard
} from 'lucide-react';
import { getAuditLogs, getAuditLogDetail } from '@/actions';
import { toast } from 'sonner';
import { AuditAction } from '@/lib/generated/prisma/enums';
import clsx from 'clsx';

// 1. Interfaz reforzada para TypeScript
interface AuditLog {
    id: string;
    createdAt: string | Date;
    usuarioNombre: string;
    accion: AuditAction;
    entityName: string;
    entityId: string;
    motivo: string | null;
    oldValues?: any;
    newValues?: any;
}

const formatCurrency = (amt: number | string | undefined | null) => {
    if (amt === undefined || amt === null) return "$0.00";
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(amt));
};

export const AuditLogView = () => {
    // --- ESTADOS ---
    // 🟢 Ajuste inicial de fecha para México
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    const [filtros, setFiltros] = useState({
        fechaInicio: today,
        fechaFin: today,
        accion: "TODAS"
    });

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => { handleSearch(); }, []);

    const handleSearch = async () => {
        if (filtros.fechaInicio > filtros.fechaFin) {
            return toast.error("La fecha de inicio no puede ser mayor a la fecha final.");
        }
        setLoading(true);
        try {
            const res = await getAuditLogs(filtros);
            if (res && res.ok && res.data) {
                setLogs(res.data as unknown as AuditLog[]);
            } else {
                toast.error(res?.message || "Error al cargar los registros");
            }
        } catch (error) {
            toast.error("Error de conexión con el servidor");
        } finally {
            setLoading(false);
        }
    };

    const openDetails = async (log: AuditLog) => {
        setSelectedLog(log);
        setIsDrawerOpen(true);
        setIsDetailLoading(true);

        try {
            const res = await getAuditLogDetail(log.id);
            if (res && res.ok && res.detail) {
                setSelectedLog({ ...log, ...res.detail });
            } else {
                toast.error("No se pudo recuperar la evidencia forense");
            }
        } catch (error) {
            toast.error("Error al consultar detalles");
        } finally {
            setIsDetailLoading(false);
        }
    };

    const closeDetails = () => {
        setIsDrawerOpen(false);
        setTimeout(() => setSelectedLog(null), 300);
    };

    const getActionUI = (accion: AuditAction) => {
        switch (accion) {
            case 'CREATE': return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <PlusCircle size={14} />, label: 'Creación' };
            case 'UPDATE': return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Edit3 size={14} />, label: 'Edición' };
            case 'DELETE': return { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: <Trash2 size={14} />, label: 'Eliminación' };
            case 'LOGIN': return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <LogIn size={14} />, label: 'Acceso' };
            default: return { color: 'bg-zinc-100 text-zinc-700 border-zinc-200', icon: <ShieldAlert size={14} />, label: accion };
        }
    };

    const RenderDataCard = ({ data, title, type, entityName, isDiffTarget = false, compareData = null }: any) => {
        if (!data) return null;

        const checkDiff = (field: string) => {
            if (!isDiffTarget || !compareData) return false;
            return String(data[field]) !== String(compareData[field]);
        };

        const highlightClass = "bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg -ml-2 border border-amber-200 shadow-sm transition-all font-bold";
        const headerClass = clsx(
            "p-4 border-b font-black uppercase text-[10px] tracking-widest flex items-center justify-between",
            type === 'old' ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-800 border-emerald-100"
        );

        if (entityName === 'Factura' && data.tipo === 'LOTE_FACTURAS_DETALLADO') {
            return (
                <div className="flex flex-col h-full bg-white border border-zinc-200 shadow-sm rounded-[2.5rem] overflow-hidden">
                    <div className={headerClass}><span>{title}</span><FileText size={14} /></div>
                    <div className="p-6 space-y-6">
                        {data.registros?.map((f: any, i: number) => (
                            <div key={i} className="space-y-4 pb-6 border-b border-zinc-100 last:border-0 last:pb-0">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600"><FileText size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Folio Eliminado</p>
                                            <p className="text-sm font-black text-zinc-900 uppercase tracking-tighter">{f.folio}</p>
                                            <span className="text-[9px] font-black text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded uppercase">{f.area}</span>
                                        </div>
                                    </div>
                                    <span className="text-lg font-black text-rose-600">{formatCurrency(f.total)}</span>
                                </div>
                                <div className="ml-4 space-y-2 border-l-2 border-dashed border-zinc-200 pl-4">
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <ArrowRightLeft size={10} /> Movimientos Liberados:
                                    </p>
                                    {f.vinculos?.map((v: any, j: number) => (
                                        <div key={j} className="flex justify-between items-center bg-zinc-50 p-3 rounded-2xl border border-zinc-100 group">
                                            <div className="flex items-center gap-3">
                                                <Hash size={12} className="text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-zinc-800 uppercase">Ref: #{v.referenciaMov.replace(/^R-/i, '')}</span>
                                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">{v.metodoPago.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                            <span className="text-xs font-black text-zinc-600">{formatCurrency(v.montoVinculado)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (entityName === 'User') {
            return (
                <div className="flex flex-col h-full bg-white border border-zinc-200 shadow-sm rounded-3xl overflow-hidden relative">
                    <div className={headerClass}><span>{title}</span> <User size={14} /></div>
                    <div className="p-5 flex-1 space-y-4">
                        <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                            <div className="p-3 bg-zinc-100 rounded-2xl"><User size={20} className="text-zinc-400" /></div>
                            <div>
                                <p className={clsx("text-sm font-black", checkDiff('name') ? highlightClass : "text-zinc-900")}>{data.name}</p>
                                <p className={clsx("text-[10px] font-bold", checkDiff('email') ? highlightClass : "text-zinc-500")}>{data.email}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-[9px] uppercase text-zinc-400 font-bold mb-1 tracking-widest">Rol</p><p className={clsx("text-xs font-black uppercase", checkDiff('role') ? highlightClass : "text-blue-700")}>{data.role}</p></div>
                            <div><p className="text-[9px] uppercase text-zinc-400 font-bold mb-1 tracking-widest">Estatus</p><div className={clsx("w-fit px-2 py-0.5 rounded text-[10px] font-black uppercase", checkDiff('active') ? highlightClass : (data.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"))}>{data.active ? "Activo" : "Inactivo"}</div></div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full bg-white border border-zinc-200 shadow-sm rounded-3xl overflow-hidden relative">
                <div className={headerClass}><span>{title}</span> <Hash size={14} /></div>
                <div className="p-5 flex-1 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-[9px] uppercase text-zinc-400 font-bold mb-1 tracking-widest">Monto</p><p className={clsx("text-lg font-black font-mono", checkDiff('montoNeto') || checkDiff('total') ? highlightClass : "text-zinc-900")}>{formatCurrency(data.montoNeto || data.total)}</p></div>
                        <div><p className="text-[9px] uppercase text-zinc-400 font-bold mb-1 tracking-widest">Dpto</p><p className={clsx("text-xs font-black uppercase", checkDiff('area') ? highlightClass : "text-zinc-700")}>{data.area?.replace('_', ' ')}</p></div>
                        <div><p className="text-[9px] uppercase text-zinc-400 font-bold mb-1 tracking-widest">Comprobante</p><p className={clsx("text-sm font-bold text-zinc-800", checkDiff('referencia') || checkDiff('folio') ? highlightClass : "")}>#{String(data.referencia || data.folio || 'N/A').replace(/^R-/i, '')}</p></div>
                        <div className="col-span-2"><p className="text-[9px] uppercase text-zinc-400 font-bold mb-1 tracking-widest">Titular</p><p className={clsx("text-sm font-bold text-zinc-800 truncate", checkDiff('nombreCliente') || checkDiff('nombreFactura') ? highlightClass : "")}>{data.nombreCliente || data.nombreFactura || "Público General"}</p></div>
                    </div>
                    {(data.detalleHotel || data.detalleRestaurante || data.detalleEvento || data.detalleSouvenir) && (
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-100">
                            {data.detalleHotel && <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-blue-100">Hab: {data.detalleHotel.habitaciones}</span>}
                            {data.detalleRestaurante && <><span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-amber-100">Mesa: {data.detalleRestaurante.mesa}</span><span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-amber-100">Pax: {data.detalleRestaurante.comensales}</span></>}
                            {data.detalleEvento && <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-purple-100">Área: {data.detalleEvento.areaRentada}</span>}
                            {data.detalleSouvenir && <span className="bg-pink-50 text-pink-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-pink-100">Art: {data.detalleSouvenir.nombre}</span>}
                        </div>
                    )}
                    {data.pagos && data.pagos.length > 0 && (
                        <div className="pt-3 border-t border-zinc-100">
                            <p className="text-[10px] uppercase text-zinc-400 font-bold mb-3 tracking-widest">Arqueo de Caja</p>
                            <div className="space-y-2">
                                {data.pagos.map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                                        <div className="flex items-center gap-2">
                                            {p.metodo === 'efectivo' ? <Wallet size={12} className="text-zinc-400" /> : <CreditCard size={12} className="text-zinc-400" />}
                                            <span className="text-[10px] font-black uppercase text-zinc-700">{p.metodo.replace('_', ' ')}</span>
                                        </div>
                                        <span className="font-mono font-black text-xs text-zinc-900">{formatCurrency(p.monto)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`max-w-7xl mx-auto p-3 md:p-8 space-y-6 bg-zinc-50/50 min-h-screen transition-all duration-300 ${loading ? 'opacity-50 blur-[1px]' : ''}`}>

            <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-end bg-white p-5 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-zinc-200 shadow-2xl relative overflow-hidden">
                <div className="flex-1 relative z-10">
                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 mb-2 italic">
                        Trazabilidad de Sistema
                    </span>
                    <h1 className="text-3xl md:text-5xl font-black italic uppercase leading-none text-zinc-900 tracking-tighter">
                        Auditoría <br className="hidden md:block" /> Gerencial
                    </h1>
                </div>

                <div className="grid grid-cols-2 md:flex md:flex-row gap-3 w-full xl:w-auto items-end relative z-10">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Inicio</label>
                        <input type="date" value={filtros.fechaInicio} onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })} className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Fin</label>
                        <input type="date" min={filtros.fechaInicio} value={filtros.fechaFin} onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })} className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none" />
                    </div>
                    <div className="col-span-2 md:w-48 space-y-1">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Acción</label>
                        <select value={filtros.accion} onChange={(e) => setFiltros({ ...filtros, accion: e.target.value })} className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none cursor-pointer">
                            <option value="TODAS">TODAS</option>
                            <option value="CREATE">CREACIÓN</option>
                            <option value="UPDATE">EDICIÓN</option>
                            <option value="DELETE">ELIMINACIÓN</option>
                        </select>
                    </div>
                    <button onClick={handleSearch} className="col-span-2 md:w-auto px-8 py-3.5 bg-zinc-900 text-white rounded-xl font-black uppercase text-sm flex items-center justify-center gap-2 shadow-lg h-12.5 cursor-pointer">
                        <Search size={18} /> <span className="md:hidden">Aplicar Filtros</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-zinc-200 overflow-hidden">
                {/* 📱 VISTA MÓVIL (CARDS) ACTUALIZADA CON ZONA HORARIA */}
                <div className="md:hidden divide-y divide-zinc-100">
                    {logs.map((log) => {
                        const ui = getActionUI(log.accion);
                        return (
                            <div key={log.id} onClick={() => openDetails(log)} className="p-5 flex flex-col gap-3 active:bg-zinc-50 transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-zinc-400">
                                            {new Date(log.createdAt).toLocaleString('es-MX', {
                                                timeZone: 'America/Mexico_City',
                                                dateStyle: 'short',
                                                timeStyle: 'short'
                                            })}
                                        </p>
                                        <p className="text-sm font-black text-zinc-900">{log.usuarioNombre}</p>
                                    </div>
                                    <div className={clsx("px-3 py-1 rounded-full text-[9px] font-black uppercase border shadow-sm", ui.color)}>{ui.label}</div>
                                </div>
                                <div className="flex justify-between items-end gap-4">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Módulo: {log.entityName}</span>
                                        <span className="text-[11px] font-medium text-zinc-600 italic line-clamp-1">"{log.motivo}"</span>
                                    </div>
                                    <button className="p-2.5 bg-zinc-900 text-white rounded-xl shadow-lg shrink-0"><FileJson size={16} /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 💻 VISTA PC (TABLA) ACTUALIZADA CON ZONA HORARIA */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                                <th className="p-6 pl-10 italic">Timestamp</th>
                                <th className="p-6">Autor</th>
                                <th className="p-6">Operación</th>
                                <th className="p-6">Entidad</th>
                                <th className="p-6 min-w-64">Motivo / Justificación</th>
                                <th className="p-6 text-right pr-10">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {logs.map((log) => {
                                const actionUI = getActionUI(log.accion);
                                const f = new Date(log.createdAt);
                                return (
                                    <tr key={log.id} className="hover:bg-zinc-50/50 transition-all group">
                                        <td className="p-6 pl-10 border-l-4 border-transparent group-hover:border-zinc-900">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-zinc-900 tracking-tighter">
                                                    {f.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                                    {f.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6"><div className="flex items-center gap-2 w-fit px-4 py-1.5 bg-zinc-100 rounded-full border border-zinc-200"><User size={12} className="text-zinc-500" /><span className="text-xs font-black text-zinc-700">{log.usuarioNombre}</span></div></td>
                                        <td className="p-6"><div className={clsx("px-3 py-1 rounded-full text-[9px] font-black uppercase border w-fit shadow-sm", actionUI.color)}>{actionUI.label}</div></td>
                                        <td className="p-6"><span className="text-xs font-black text-zinc-400 uppercase tracking-widest">{log.entityName}</span></td>
                                        <td className="p-6 max-w-sm truncate text-xs italic text-zinc-600">"{log.motivo}"</td>
                                        <td className="p-6 text-right pr-10"><button onClick={() => openDetails(log)} className="p-3 bg-white border-2 border-zinc-100 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all rounded-2xl shadow-sm cursor-pointer active:scale-90"><FileJson size={20} /></button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {logs.length === 0 && (
                    <div className="py-24 text-center">
                        <AlertCircle className="mx-auto text-zinc-200" size={40} />
                        <p className="text-zinc-900 font-black uppercase text-sm italic mt-4">Sin registros de auditoría</p>
                    </div>
                )}
            </div>

            <div className={`fixed inset-0 z-100 flex justify-end transition-all ${isDrawerOpen ? 'visible' : 'invisible'}`}>
                <div className={`absolute inset-0 bg-zinc-950/80 backdrop-blur-md transition-opacity duration-500 ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}`} onClick={closeDetails} />
                <div className={`relative w-full lg:max-w-6xl bg-zinc-50 h-screen shadow-2xl transition-transform duration-500 transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col overflow-hidden`}>
                    {selectedLog && (
                        <div className="flex flex-col h-full">
                            <div className="p-6 md:p-8 bg-white border-b border-zinc-200 flex justify-between items-center shadow-lg z-10">
                                <div className="flex gap-4 items-center min-w-0">
                                    <div className={clsx("p-3 rounded-2xl hidden sm:block", getActionUI(selectedLog.accion).color)}>{getActionUI(selectedLog.accion).icon}</div>
                                    <div className="min-w-0">
                                        <h2 className="text-lg md:text-2xl font-black text-zinc-900 uppercase italic tracking-tighter truncate">Análisis de Evidencia</h2>
                                        {/* 🟢 Detalle del Drawer protegido con zona horaria */}
                                        <p className="text-[9px] md:text-xs font-bold text-zinc-400 tracking-widest uppercase flex items-center gap-2 mt-1 truncate">
                                            Autor: {selectedLog.usuarioNombre} | {new Date(selectedLog.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={closeDetails} className="p-3 bg-zinc-100 hover:bg-rose-100 hover:text-rose-600 rounded-2xl transition-all cursor-pointer"><X size={24} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 md:p-10 space-y-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[20px_20px]">
                                {isDetailLoading ? (
                                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-6">
                                        <Loader2 className="animate-spin text-zinc-900" size={50} strokeWidth={1} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Leyendo evidencia de Neon DB...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-6 md:p-8 bg-amber-50 border-2 border-amber-200 rounded-[2.5rem] md:rounded-[3rem] shadow-xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><ShieldAlert size={60} /></div>
                                            <p className="text-[9px] font-black uppercase text-amber-600 tracking-[0.3em] mb-2 flex items-center gap-2"><AlertCircle size={14} /> Justificación del Cambio</p>
                                            <p className="text-sm md:text-lg font-bold text-amber-950 italic leading-relaxed">"{selectedLog.motivo || 'N/A'}"</p>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <RenderDataCard title="Captura Original" data={selectedLog.oldValues} type="old" entityName={selectedLog.entityName} />
                                            </div>
                                            <div className="space-y-4">
                                                <RenderDataCard
                                                    title="Captura Final"
                                                    data={selectedLog.newValues}
                                                    type="new"
                                                    entityName={selectedLog.entityName}
                                                    isDiffTarget={selectedLog.accion === 'UPDATE'}
                                                    compareData={selectedLog.oldValues}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};