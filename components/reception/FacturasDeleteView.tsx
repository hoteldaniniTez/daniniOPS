"use client";

import { useState, useMemo } from 'react';
import { Search, Loader2, CreditCard, Landmark, Trash2, AlertCircle, FileStack, Hash, FileText } from 'lucide-react';
import { TipoFactura } from '@/lib/generated/prisma/enums';
import { getSuccessPayments, deleteFacturas, searchFacturas } from '@/actions';
import { toast } from "sonner";
import { usePagoStore } from '@/store';
import { PagoFactura } from '@/interfaces';
import { DeleteFacturaModal } from './facturas/DeleteFacturaModal';

export const FacturasDeleteView = () => {
    // --- ESTADOS ---
    const [tipoFactura, setTipoFactura] = useState<TipoFactura>(TipoFactura.GLOBAL);
    const hoyMexico = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    const [fecha, setFecha] = useState(hoyMexico);
    const [searchQuery, setSearchQuery] = useState("");
    const [pendingPayments, setPendingPayments] = useState<PagoFactura[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { selectedPagoIds, togglePagoSelection, resetPagoStore } = usePagoStore();

    // 1. Búsqueda General por Filtros (Fecha y Tipo)
    const handleSearch = async () => {
        resetPagoStore();
        setLoading(true);
        resetPagoStore();
        const res = await getSuccessPayments({ tipoFactura, fecha });
        if (res.ok) {
            setPendingPayments(res.payments as PagoFactura[] || []);
        } else {
            toast.error("Error al consultar registros");
        }
        setLoading(false);
    };

    // 2. 🟢 BÚSQUEDA UNIVERSAL INTELIGENTE (UX Experta)
    // Detecta si el usuario ingresó una referencia numérica o un folio alfanumérico
    const handleUniversalSearch = async (e: React.KeyboardEvent) => {
        // Solo actuamos si presionan Enter y hay texto en el input
        if (e.key !== 'Enter' || !searchQuery) return;

        setLoading(true);
        resetPagoStore(); // Limpiamos selecciones previas por seguridad

        try {
            // 🟢 Llamamos al nuevo Action unificado que busca por Folio, Referencia o Nombre
            const res = await searchFacturas(searchQuery);

            if (res.ok) {
                setPendingPayments(res.payments as PagoFactura[]);
                // Mensaje genérico pero profesional de éxito
                toast.success(`Resultados encontrados para: "${searchQuery}"`);
            } else {
                // Manejo de error cuando no hay coincidencias
                toast.error(res.message || "No se encontraron facturas con esos datos");
                setPendingPayments([]);
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado en la búsqueda");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        if (selectedPayments.length === 0) return toast.error("Selecciona al menos un registro");
        setIsModalOpen(true);
    };

    const onConfirmDelete = async (motivo: string) => {
        const facturaIds = Array.from(
            new Set(selectedPayments.map(p => p.facturaId).filter(Boolean))
        ) as string[];

        setLoading(true);
        try {
            // 🟢 Pasamos el motivo al Action
            const res = await deleteFacturas(facturaIds, motivo);

            if (res.ok) {
                toast.success(res.message);
                setIsModalOpen(false); // Cerramos modal
                setSearchQuery("");
                handleSearch();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Error de comunicación");
        } finally {
            setLoading(false);
        }
    };

    const selectedPayments = useMemo(() => {
        return pendingPayments.filter(p => selectedPagoIds.includes(p.id)) as PagoFactura[];
    }, [pendingPayments, selectedPagoIds]);

    // 3. Lógica de Eliminación (Reversión Fiscal)


    return (
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 p-2 md:p-0">
            <DeleteFacturaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={onConfirmDelete}
                isLoading={loading}
                count={selectedPayments.length}
            />
            {/* PANEL DE CONTROL SUPERIOR */}
            <div className="bg-white p-4 md:p-8 rounded-4xl border border-zinc-100 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center pb-4 gap-4 border-b border-zinc-50">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600 italic">Módulo de Reversión</span>
                        <h1 className="text-xl md:text-2xl font-black text-zinc-900 italic uppercase">Desvinculación Fiscal</h1>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Factura</label>
                        <div className="flex bg-zinc-100 p-1 rounded-xl w-full">
                            <button onClick={() => setTipoFactura(TipoFactura.GLOBAL)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${tipoFactura === TipoFactura.GLOBAL ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`}>Global</button>
                            <button onClick={() => setTipoFactura(TipoFactura.INDIVIDUAL)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${tipoFactura === TipoFactura.INDIVIDUAL ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`}>Individual</button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:grid md:grid-cols-3 gap-3 items-end">
                    {/* INPUT DE BÚSQUEDA INTELIGENTE */}
                    <div className="md:col-span-1 space-y-1 w-full relative">
                        <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1">Búsqueda Universal</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
                            <input
                                type="text"
                                placeholder="Folio o #Referencia + Enter"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleUniversalSearch}
                                className="w-full pl-11 pr-4 py-3 bg-zinc-100 border-2 border-transparent rounded-2xl text-xs font-bold outline-none focus:border-rose-500 focus:bg-white transition-all placeholder:text-zinc-400"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-1 space-y-1.5 w-full">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Consultar por Fecha</label>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-bold outline-none focus:border-zinc-900 transition-all"
                        />
                    </div>

                    <button
                        onClick={handleSearch}
                        // onClick={handleOpenModal}
                        disabled={loading}
                        className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <><Search size={18} /> Consultar Fecha</>}
                    </button>
                </div>
            </div>

            {/* CUERPO PRINCIPAL: LISTADO Y RESUMEN */}
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">

                {/* COLUMNA IZQUIERDA: RESULTADOS */}
                <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl overflow-hidden min-h-125">
                    <div className="p-4 bg-zinc-50 border-b flex justify-between items-center text-[9px] font-black uppercase text-zinc-400 italic">
                        <span>Registros encontrados</span>
                        <span>{pendingPayments.length} registros</span>
                    </div>

                    <div className="p-4 space-y-3 max-h-150 overflow-y-auto custom-scrollbar">
                        {pendingPayments.length === 0 ? (
                            <div className="py-24 text-center opacity-20">
                                <FileStack size={48} className="mx-auto mb-2" />
                                <p className="font-bold text-[10px] uppercase tracking-widest">Sin registros cargados</p>
                            </div>
                        ) : (
                            pendingPayments.map(pago => {
                                const isSelected = selectedPagoIds.includes(pago.id);
                                return (
                                    <div
                                        key={pago.id}
                                        onClick={() => togglePagoSelection(pago.id, tipoFactura === TipoFactura.INDIVIDUAL)}
                                        className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex justify-between items-center group ${isSelected
                                            ? 'border-rose-500 bg-rose-50/30'
                                            : 'border-zinc-50 bg-zinc-50/30 hover:border-zinc-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            {/* Icono con estado de selección */}
                                            <div className={`p-3 rounded-xl transition-colors shrink-0 ${isSelected ? 'bg-rose-500 text-white' : 'bg-white text-zinc-300'
                                                }`}>
                                                {pago.metodo === 'transferencia' ? <Landmark size={18} /> : <CreditCard size={18} />}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Hash size={12} className="text-rose-500" />
                                                    <p className="font-mono text-base font-black text-rose-500 tracking-tighter">
                                                        {pago.movimiento.referencia.replace(/^R-/i, '')}
                                                    </p>
                                                    {/* Badge del Área */}
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${isSelected ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                                                        }`}>
                                                        {pago.movimiento.area}
                                                    </span>
                                                </div>

                                                <div className="flex flex-col gap-0.5 mt-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-zinc-900 text-white rounded uppercase shadow-sm">
                                                            {pago.factura?.folio || 'PARCIAL'}
                                                        </span>
                                                        {/* Nombre del Cliente del Movimiento */}
                                                        <span className={`text-[10px] font-extrabold uppercase truncate ${isSelected ? 'text-rose-900' : 'text-zinc-800'
                                                            }`}>
                                                            {pago.movimiento.nombreCliente || 'Sin Cliente'}
                                                        </span>
                                                    </div>

                                                    {/* Información fiscal y Cajero */}
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-bold uppercase italic ${isSelected ? 'text-rose-400' : 'text-zinc-400'
                                                            }`}>
                                                            Razón: {pago.nombreFactura || 'Público'}
                                                        </span>
                                                        {/* <span className="text-[9px] font-medium text-zinc-300 uppercase">
                                                            • Cobró: {pago.cajero?.name?.split(' ')[0]}
                                                        </span> */}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0 ml-4">
                                            <p className={`text-lg font-black ${isSelected ? 'text-rose-600' : 'text-zinc-900'}`}>
                                                ${Number(pago.monto).toFixed(2)}
                                            </p>
                                            {pago.facturasVinculadas && pago.facturasVinculadas.length > 1 && (
                                                <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase italic">
                                                    Multifactura
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: LISTA DE REVERSIÓN */}
                <div className="lg:col-span-5">
                    <div className="bg-zinc-900 p-8 rounded-[3rem] text-white shadow-2xl space-y-6 sticky top-8 border border-white/5 overflow-hidden">
                        <div className="text-center relative z-10">
                            <label className="text-[10px] font-black uppercase opacity-40 tracking-[0.3em]">Cola de Reversión</label>
                            <p className="text-xs font-bold text-rose-500 italic uppercase mt-1">
                                {selectedPayments.length === 0 ? "Selecciona registros" : "Confirmar desvinculación"}
                            </p>
                        </div>

                        {/* Listado pequeño de lo seleccionado */}
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                            {selectedPayments.length === 0 && (
                                <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                                    <Trash2 size={32} className="mx-auto mb-2" />
                                    <p className="text-[9px] font-bold uppercase">Vacio</p>
                                </div>
                            )}
                            {selectedPayments.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 animate-in slide-in-from-right-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Recibo #{p.movimiento.referencia.replace(/^R-/i, '')}</span>
                                        <span className="text-[11px] font-bold opacity-60 uppercase truncate w-32">{p.nombreFactura || 'Público'}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 justify-end">
                                            <FileText size={10} className="text-rose-400" />
                                            <span className="text-[10px] font-black text-rose-400 uppercase">{p.factura?.folio}</span>
                                        </div>
                                        <span className="block text-sm font-black tracking-tight">${(p.monto).toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selectedPayments.length > 0 && (
                            <button
                                onClick={handleOpenModal} // 🟢 Cambiado: ya no borra, solo abre el modal
                                disabled={loading}
                                className="w-full py-6 bg-rose-600 text-white rounded-3xl font-black uppercase text-xs shadow-2xl hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-3 group relative z-10"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : (
                                    <>
                                        <Trash2 size={16} className="group-hover:rotate-12 transition-transform" />
                                        Revertir {selectedPayments.length} {selectedPayments.length === 1 ? 'Registro' : 'Registros'}
                                    </>
                                )}
                            </button>
                        )}

                        <div className="flex gap-3 items-start p-5 bg-rose-500/10 rounded-2xl border border-rose-500/20 relative z-10">
                            <AlertCircle size={16} className="text-rose-500 shrink-0" />
                            <p className="text-[9px] text-rose-200/70 font-bold uppercase italic leading-tight">
                                Al eliminar la factura, el monto correspondiente se liberará y el pago volverá a estar disponible para una nueva asignación fiscal.
                            </p>
                        </div>

                        {/* Decoración visual de fondo */}
                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};