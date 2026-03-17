"use client";

import { useMemo, useState, useEffect } from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import {
    Wallet, CreditCard, Landmark, ArrowUpRight,
    X, Sparkles, Heart, Gift, FileText, Info, Calculator,
    Edit3, Trash2, AlertTriangle, Link as LinkIcon,
    CheckCircle2, XCircle, User,
    PersonStanding,
    Clock,
    MinusCircle
} from 'lucide-react';
import { AreasEvento, AREAT, MESEROS, METODOS_CON_FACTURA, METODOS_PAGO_OPCIONES, MovimientoCompleto, TERMINALES, TipoEvento } from '@/interfaces';
import { getMovementsbyUser, updateMovement, deleteMovement } from "@/actions";
import { toast } from "sonner";
import { MetodoPago, TerminalTipo, TipoTarjeta } from '@/lib/generated/prisma/enums';
import { useUIStore } from '@/store/ui-store';
import { AreaGroup, KPICard, MiniCard } from './movement-ui';
import { usePagoStore } from '@/store';
import { DeleteMovementModal } from '../ui/DeleteMovementModal';

interface Props {
    initialMovements: MovimientoCompleto[];
    initialTurno: 'dia' | 'tarde' | 'noche';
}

// --- CONSTANTES DE CONFIGURACIÓN OPERATIVA ---
const MOTIVOS_AUDITORIA = [
    "Error de captura (monto, referencia, datos generales)",
    "Corrección en método o distribución de pago",
    "Ajuste relacionado con cupón o cortesía",
    "Corrección de anticipo o crédito",
    "Reclasificación de área / servicio",
    "Cancelación total o parcial del movimiento",
    "Ajuste por diferencia detectada en corte",
    "Corrección autorizada por gerencia",
    "Movimiento duplicado",
    "Otro (Especificar en descripción)"
];


export const CorteClientView = ({ initialMovements, initialTurno }: Props) => {
    // --- ESTADOS Y UI ---
    const [movements, setMovements] = useState(initialMovements);
    const [turno, setTurno] = useState(initialTurno);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showLiquidacionForm, setShowLiquidacionForm] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { isDetailOpen, selectedMovement, openDetail, closeDetail } = useUIStore();

    // --- FORMULARIO Y CAMPO ARRAY ---
    const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<any>({
        mode: "onChange"
    });

    const { fields, append, remove } = useFieldArray({ control, name: "pagos" });

    // Observadores
    const montoNetoEditado = watch("montoNeto");
    const pagosWatch = watch("pagos") || [];
    const motivoSeleccionado = watch("motivoSeleccionado");
    const motivoDetalle = watch("motivoDetalle");

    const stopWheel = (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur();
    const formatCurrency = (amt: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amt);

    const { updatePagos, setTotalADebuer, getResumen, resetPagoStore } = usePagoStore();
    const { faltante, listoParaLiquidar } = getResumen(); // Usa esto en lugar de tus variables locales

    useEffect(() => {
        // Si el usuario cambia el Monto Neto principal, actualizamos el "Total a Deber" en la Store
        if (montoNetoEditado !== undefined) {
            setTotalADebuer(Number(montoNetoEditado));
        }
    }, [montoNetoEditado, setTotalADebuer]);
    // 2. Sincroniza el watch del formulario con Zustand
    useEffect(() => {
        updatePagos(pagosWatch);

        // 🟢 SEGURIDAD ADICIONAL: Limpiar datos inconsistentes mientras se observa el cambio
        pagosWatch.forEach((pago: any, index: number) => {
            const metodo = pago.metodo as MetodoPago;

            // Si el método actual no admite factura pero el switch está activo, forzar apagado
            if (!METODOS_CON_FACTURA.includes(metodo) && pago.requiereFactura) {
                setValue(`pagos.${index}.requiereFactura`, false, { shouldValidate: true });
            }

            // Si no es tarjeta, asegurar que los campos de terminal estén vacíos
            if (metodo !== MetodoPago.tarjeta && (pago.numTerminal || pago.tipoTarjeta)) {
                setValue(`pagos.${index}.numTerminal`, null);
                setValue(`pagos.${index}.tipoTarjeta`, null);
            }
        });
    }, [pagosWatch, updatePagos, setValue]);

    // 3. Inicializa el total cuando se selecciona un movimiento
    useEffect(() => {
        if (selectedMovement) {
            setTotalADebuer(Number(selectedMovement.montoNeto));
        }
    }, [selectedMovement, setTotalADebuer]);

    // Efecto para cargar datos en el formulario de edición
    useEffect(() => {
        if (selectedMovement && isEditing) {
            reset({
                id: selectedMovement.id,
                area: selectedMovement.area,
                referencia: selectedMovement.referencia.replace(/^R-/i, ''),
                nombreCliente: selectedMovement.nombreCliente,
                montoNeto: Number(selectedMovement.montoNeto),
                descripcion: selectedMovement.descripcion,
                habitaciones: selectedMovement.detalleHotel?.habitaciones || "",
                mesa: selectedMovement.detalleRestaurante?.mesa || "",
                mesero: selectedMovement.detalleRestaurante?.mesero || "",
                comensales: selectedMovement.detalleRestaurante?.comensales || 0,
                areaRentada: selectedMovement.detalleEvento?.areaRentada || "",
                tipoEvento: selectedMovement.detalleEvento?.tipoEvento || "",
                nombreSouvenir: selectedMovement.detalleSouvenir?.nombre || "",
                motivoSeleccionado: "",
                motivoDetalle: "",
                pagos: selectedMovement.pagos.map((p: any) => ({
                    id: p.id,
                    metodo: p.metodo,
                    monto: Number(p.monto),
                    propina: Number(p.propina),
                    referencia: p.referencia || "",
                    requiereFactura: p.requiereFactura,
                    nombreFactura: p.nombreFactura || "",
                    numTerminal: p.numTerminal || null,
                    tipoTarjeta: p.tipoTarjeta || null
                }))
            });
        }
    }, [selectedMovement, isEditing, reset]);

    // --- HANDLERS ---
    const handleTurnoChange = async (nuevoTurno: 'dia' | 'tarde' | 'noche') => {
        setLoading(true);
        setTurno(nuevoTurno);
        const res = await getMovementsbyUser(nuevoTurno);
        if (res.movements) setMovements(res.movements as any);
        setLoading(false);
    };

    const totals = useMemo(() => {
        const res = {
            efectivo: 0, transferencia: 0, tarjeta: 0, p_deposito: 0,
            credito_familiar: 0, credito_cobrar: 0, cortesia_r: 0,
            cortesia_h: 0, cupon: 0, t4303: 0, t4449: 0,
            propinas: 0, ingresoNeto: 0, granTotalCaja: 0
        };

        movements.forEach(m => {
            // 🟢 1. Revisamos si este movimiento en particular tiene OTROS métodos de pago
            const tieneOtrosPagos = m.pagos.some((pago: any) => pago.metodo !== 'credito_cobrar');

            m.pagos.forEach((p: any) => {
                const monto = Number(p.monto);
                const propina = Number(p.propina || 0);
                res.propinas += propina;

                // 🟢 2. Aplicamos la regla: Si es crédito y tiene otros pagos, no sumamos.
                // Si es cualquier otro caso normal, lo sumamos al acumulador correspondiente.
                if (p.metodo === 'credito_cobrar' && tieneOtrosPagos) {
                    // No hacemos nada, efectivamente sumando 0 al total de créditos por cobrar
                } else {
                    // Sumamos normalmente
                    if (p.metodo in res) (res as any)[p.metodo] += monto;
                }

                // Lógica de terminales
                if (p.metodo === MetodoPago.tarjeta) {
                    if (p.numTerminal === TerminalTipo.T_4303851) res.t4303 += monto;
                    if (p.numTerminal === TerminalTipo.T_4449999) res.t4449 += monto;
                }

                // Lógica de Gran Total
                if (p.metodo !== MetodoPago.cupon && p.metodo !== MetodoPago.credito_cobrar) {
                    res.granTotalCaja += (monto + propina);
                }
            });
        });

        res.ingresoNeto = res.granTotalCaja - res.propinas;
        return res;
    }, [movements]);

    const onUpdateSubmit = async (data: any) => {
        const motivoFinal = `${data.motivoSeleccionado}: ${data.motivoDetalle}`.trim();
        const loadingToast = toast.loading("Actualizando registro...");
        const res = await updateMovement({ ...data, motivo: motivoFinal });
        if (res.ok) {
            toast.success(res.message, { id: loadingToast });
            handleTurnoChange(turno);
            setIsEditing(false);
            closeDetail();
        } else {
            toast.error(res.message, { id: loadingToast });
        }
    };

    const handleDelete = async () => {
        if (!selectedMovement) return;

        const motivoFinal = `${motivoSeleccionado}: ${motivoDetalle}`.trim();
        setIsDeleting(true);
        const loadingToast = toast.loading("Eliminando registro...");

        try {
            const res = await deleteMovement(selectedMovement.id, motivoFinal);

            // 🟢 VALIDACIÓN PARA TYPESCRIPT: 
            // Verificamos que 'res' exista y tenga la propiedad 'ok'
            if (res && res.ok) {
                toast.success(res.message || "Movimiento eliminado", { id: loadingToast });

                // 🟢 ACTUALIZACIÓN DE PANTALLA:
                // Filtramos el estado local para que el movimiento desaparezca SIN refrescar
                setMovements(prev => prev.filter(m => m.id !== selectedMovement.id));

                // Cerramos todo
                setIsDeleteModalOpen(false);
                setIsEditing(false);
                closeDetail();
            } else {
                // Manejo de error cuando el servidor responde con ok: false
                toast.error(res?.message || "No se pudo eliminar el registro", { id: loadingToast });
            }
        } catch (error) {
            // Manejo de error si se cae la red o Neon falla
            toast.error("Error de conexión al eliminar", { id: loadingToast });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className={`space-y-6 max-w-400 mx-auto p-4 transition-all ${loading ? 'opacity-50 blur-sm' : ''}`}>

            {/* KPIs PRINCIPALES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard title="Ventas Netas" amount={totals.ingresoNeto} icon={<ArrowUpRight />} color="bg-zinc-900" subtitle="Ingreso Real del Turno" />
                <KPICard title="Bolsa de Propinas" amount={totals.propinas} icon={<Sparkles />} color="bg-amber-500" subtitle="Total Personal" />
                <KPICard title="Gran Total en Caja" amount={totals.granTotalCaja} icon={<Calculator />} color="bg-emerald-600" isMain subtitle="Ingreso Físico de Turno" />
            </div>

            {/* DESGLOSE DE ARQUEO */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <MiniCard title="Efectivo" amount={totals.efectivo} icon={<Wallet size={14} />} color="text-emerald-600" />
                <MiniCard title="P/Depósito" amount={totals.p_deposito} icon={<Landmark size={14} />} color="text-cyan-600" />
                <MiniCard title="Transf." amount={totals.transferencia} icon={<Landmark size={14} />} color="text-purple-600" />
                <MiniCard title="T-4303851" amount={totals.t4303} icon={<CreditCard size={14} />} color="text-blue-600" />
                <MiniCard title="T-4449999" amount={totals.t4449} icon={<CreditCard size={14} />} color="text-blue-600" />
                <MiniCard title="Cred. Fam." amount={totals.credito_familiar} icon={<Heart size={14} />} color="text-rose-600" />
                <MiniCard title="Cortesía H" amount={totals.cortesia_h} icon={<Gift size={14} />} color="text-yellow-400" />
                <MiniCard title="Cortesía R" amount={totals.cortesia_r} icon={<Gift size={14} />} color="text-teal-400" />
                <MiniCard title="Por Cobrar" amount={totals.credito_cobrar} icon={<FileText size={14} />} color="text-lime-500" isPending />
            </div>

            {/* CONTROL DE TURNOS */}
            <div className="flex bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm w-fit gap-2">
                {(['dia', 'tarde', 'noche'] as const).map((t) => (
                    <button key={t} onClick={() => handleTurnoChange(t)} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${turno === t ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-400'} cursor-pointer hover:bg-zinc-50`}>Corte {t}</button>
                ))}
            </div>

            {/* TABLA DE MOVIMIENTOS */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                            <th className="p-5 pl-8">Ref / Cliente</th>
                            <th className="p-5 text-center">Factura</th>
                            <th className="p-5">Detalle Operativo</th>
                            <th className="p-5">Desglose Pagos</th>
                            <th className="p-5 text-right pr-8">Importe Final (Caja)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {Object.entries(movements.reduce((acc, mov) => {
                            const area = mov.area;
                            if (!acc[area]) acc[area] = [];
                            acc[area].push(mov);
                            return acc;
                        }, {} as Record<string, MovimientoCompleto[]>)).map(([area, movs]) => (
                            <AreaGroup
                                key={area}
                                area={area}
                                movs={movs}
                                formatCurrency={formatCurrency}
                                onOpenDetails={(m: any) => {
                                    openDetail(m);
                                    setIsEditing(false);
                                    setShowLiquidacionForm(false);
                                }}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- SECCIÓN 5: DRAWER LATERAL (DETALLE / EDICIÓN MAESTRA) --- */}
            <div className={`fixed inset-0 z-50 flex justify-end transition-all ${isDetailOpen ? 'visible' : 'invisible'}`}>
                <div className={`absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-500 ${isDetailOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => { closeDetail(); setIsEditing(false); setShowLiquidacionForm(false); }} />

                <div className={`relative w-full max-w-lg bg-white h-screen shadow-2xl transition-transform duration-500 transform ${isDetailOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col overflow-hidden`}>
                    {selectedMovement && (
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                                {/* CABECERA */}
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-black text-zinc-900 italic">{isEditing ? 'Editar Registro' : 'Detalle de Movimiento'}</h2>
                                    <button onClick={() => { closeDetail(); setIsEditing(false); resetPagoStore(); }} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X size={24} /></button>
                                </div>

                                {/* CUERPO DINÁMICO */}
                                <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-6">
                                    <form id="master-edit-form" onSubmit={handleSubmit(onUpdateSubmit)} className="space-y-6">

                                        {/* AUDITORÍA OBLIGATORIA */}
                                        {isEditing && (
                                            <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-4xl space-y-4 shadow-sm animate-in zoom-in-95 duration-300">
                                                <div className="flex items-center justify-between text-amber-700 font-black uppercase text-[10px]">
                                                    <div className="flex items-center gap-2"><AlertTriangle size={14} /> Auditoría Requerida</div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!motivoSeleccionado || motivoDetalle?.length < 5) {
                                                                toast.error("Completa el motivo de la auditoría antes de eliminar.");
                                                                return;
                                                            }
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                        className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 size={14} /> Eliminar Registro
                                                    </button>
                                                </div>
                                                <select {...register("motivoSeleccionado", { required: isEditing })} className="w-full p-3 bg-white border border-amber-200 rounded-2xl text-xs font-bold outline-none cursor-pointer">
                                                    <option value="">Seleccione motivo de edición...</option>
                                                    {MOTIVOS_AUDITORIA.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                                <textarea {...register("motivoDetalle", { required: isEditing, minLength: 5 })} placeholder="Describe el cambio realizado..." className="w-full p-4 bg-white border border-amber-200 rounded-2xl text-[11px] min-h-24 outline-none" />
                                            </div>
                                        )}


                                        {/* DATOS GENERALES */}
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-zinc-400">Área</label>
                                                {isEditing ? (
                                                    <select
                                                        {...register("area", { required: true })}
                                                        className={`w-full h-9 px-3 rounded-xl text-[10px] font-black outline-none cursor-pointer border transition-all ${errors.area ? 'border-red-500 bg-red-50 text-red-900' : 'bg-blue-50 text-blue-700 border-transparent focus:border-blue-200'}`}
                                                    >
                                                        <option value="">Seleccionar Terminal</option>
                                                        {AREAT.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                                    </select>
                                                ) : (
                                                    <p className="text-sm font-bold text-zinc-900">{selectedMovement.area}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-zinc-400"># Recibo/Comanda</label>
                                                {isEditing ? (
                                                    <input {...register("referencia", { required: true })} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-2xl font-bold outline-none focus:border-zinc-900 transition-all" />
                                                ) : (
                                                    <p className="text-sm font-bold text-zinc-900">{selectedMovement.referencia.replace(/^R-/i, '')}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-zinc-400">Cliente</label>
                                                {isEditing ? (
                                                    <input {...register("nombreCliente")} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-2xl font-bold outline-none focus:border-zinc-900 transition-all" />
                                                ) : (
                                                    <p className="text-sm font-bold text-zinc-900">{selectedMovement.nombreCliente ? selectedMovement.nombreCliente : 'General'}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* NOTAS */}
                                        {selectedMovement.descripcion && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Descripción / Notas</label>
                                                {isEditing ? (
                                                    <textarea {...register("descripcion")} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-medium outline-none focus:border-zinc-900 min-h-20" />
                                                ) : (
                                                    <p className="w-full text-sm font-bold text-zinc-900 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">{selectedMovement.descripcion}</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="p-4 bg-zinc-50 rounded-3xl space-y-4 border border-zinc-100">
                                            <p className="text-[10px] font-black uppercase text-zinc-400 italic flex items-center gap-2"><Info size={12} /> Detalles {selectedMovement.area}</p>
                                            <div className="grid grid-cols-12 gap-3">
                                                {selectedMovement.area.includes('HOTEL') && (
                                                    <div className="col-span-12 space-y-1">
                                                        <label className="text-[9px] font-bold text-zinc-400 uppercase ml-1">Número(s) de habitación</label>
                                                        {isEditing ? <input {...register("habitaciones")} className="w-full p-2 bg-white border rounded-xl text-xs font-black outline-none" /> : <p className="text-xs font-black px-1">{selectedMovement.detalleHotel?.habitaciones}</p>}
                                                    </div>
                                                )}
                                                {selectedMovement.area.includes('RESTAURANTE') && (
                                                    <>
                                                        <div className="col-span-4 space-y-1">
                                                            <label className="text-[9px] font-bold text-zinc-400 uppercase ml-1">Mesero</label>
                                                            {isEditing ? <select {...register("mesero")} className="w-full p-2 bg-white border rounded-xl text-xs font-black outline-none">{MESEROS.map(m => <option key={m} value={m}>{m}</option>)}</select> : <p className="text-xs font-black px-1">{selectedMovement.detalleRestaurante?.mesero}</p>}
                                                        </div>
                                                        <div className="col-span-4 space-y-1">
                                                            <label className="text-[9px] font-bold text-zinc-400 uppercase ml-1">Mesa</label>
                                                            {isEditing ? <input {...register("mesa")} className="w-full p-2 bg-white border rounded-xl text-xs font-black outline-none" /> : <p className="text-xs font-black px-1">{selectedMovement.detalleRestaurante?.mesa}</p>}
                                                        </div>
                                                        <div className="col-span-4 space-y-1">
                                                            <label className="text-[9px] font-bold text-zinc-400 uppercase ml-1">Comensales</label>
                                                            {isEditing ? <input {...register("comensales")} className="w-full p-2 bg-white border rounded-xl text-xs font-black outline-none" /> : <p className="text-xs font-black px-1">{selectedMovement.detalleRestaurante?.comensales}</p>}
                                                        </div>
                                                    </>
                                                )}
                                                {selectedMovement.detalleEvento && (
                                                    <>
                                                        <div className="col-span-6 space-y-1">
                                                            <label className="text-[9px] font-bold text-zinc-400 uppercase ml-1">Área Rentada</label>
                                                            {isEditing ? <select {...register("areaRentada")} className="w-full p-2 bg-white border rounded-xl text-xs font-black outline-none">{AreasEvento.map(a => <option key={a} value={a}>{a}</option>)}</select> : <p className="text-xs font-black px-1">{selectedMovement.detalleEvento?.areaRentada}</p>}
                                                        </div>
                                                        <div className="col-span-6 space-y-1">
                                                            <label className="text-[9px] font-bold text-zinc-400 uppercase ml-1">Tipo Evento</label>
                                                            {isEditing ? <select {...register("tipoEvento")} className="w-full p-2 bg-white border rounded-xl text-xs font-black outline-none">{TipoEvento.map((e: any) => <option key={e} value={e}>{e}</option>)}</select> : <p className="text-xs font-black px-1">{selectedMovement.detalleEvento?.tipoEvento}</p>}
                                                        </div>
                                                    </>
                                                )}
                                                {selectedMovement.detalleSouvenir && (
                                                    <div className="col-span-12 space-y-1">
                                                        <label className="text-[9px] font-bold text-zinc-400 uppercase ml-1">Nombre</label>
                                                        {isEditing ? <input {...register("nombreSouvenir")} className="w-full p-2 bg-white border rounded-xl text-xs font-black outline-none" /> : <p className="text-xs font-black px-1">{selectedMovement.detalleSouvenir?.nombre}</p>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* RESUMEN MONETARIO (EN EDICIÓN) */}
                                        {isEditing
                                            ? <>
                                                <div className="bg-zinc-900 p-6 rounded-[2.5rem] text-white shadow-xl grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase opacity-50 ml-1">Monto Neto</label>
                                                        <div className="flex items-center gap-1 border-b border-zinc-700">
                                                            <span className="text-xl font-black">$</span>
                                                            <input type="number" step="0.01" onWheel={stopWheel} {...register("montoNeto", { valueAsNumber: true })} className="w-full bg-transparent text-xl font-black outline-none py-1" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100 space-y-4 animate-in fade-in zoom-in-95">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-[10px] font-black uppercase text-emerald-700">Liquidación de Deuda</h3>
                                                        <div className={`px-4 py-1 rounded-full text-[10px] font-black ${listoParaLiquidar ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                                            {faltante > 0 ? `FALTA: ${formatCurrency(faltante)}` : faltante < 0 ? `SOBRAN: ${formatCurrency(faltante * -1)}` : `TOTAL CUBIERTO`}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {fields.map((field, index) => {
                                                            const valorFacturaIndividual = watch(`pagos.${index}.requiereFactura`);
                                                            const hasPagoError = (errors.pagos as any)?.[index];
                                                            const metodosExcluidos = [
                                                                "credito_cobrar", "cupon", "cortesia_h", "cortesia_r", "credito_familiar", "efectivo"
                                                            ];

                                                            return (
                                                                <div key={field.id} className={`p-4 bg-white rounded-3xl border grid grid-cols-12 gap-3 items-end shadow-sm animate-in slide-in-from-right-1 transition-colors ${hasPagoError ? 'border-red-200 bg-red-50/30' : 'border-emerald-100'}`}>

                                                                    {/* MÉTODO DE PAGO */}
                                                                    <div className="col-span-6 flex flex-col">
                                                                        <label className={`text-[10px] font-bold uppercase ml-1 mb-1 ${hasPagoError?.metodo ? 'text-red-500' : 'text-zinc-400'}`}>Método</label>
                                                                        <select
                                                                            {...register(`pagos.${index}.metodo` as const, { required: true })}
                                                                            onChange={(e) => {
                                                                                const nuevoMetodo = e.target.value as MetodoPago;

                                                                                // 1. Actualizar el valor del método en el formulario
                                                                                setValue(`pagos.${index}.metodo`, nuevoMetodo);

                                                                                // 🟢 LIMPIEZA DE FACTURA: Si el nuevo método no permite factura, la apagamos
                                                                                if (!METODOS_CON_FACTURA.includes(nuevoMetodo)) {
                                                                                    setValue(`pagos.${index}.requiereFactura`, false);
                                                                                    setValue(`pagos.${index}.nombreFactura`, "");
                                                                                }

                                                                                // 🟢 LIMPIEZA DE TERMINAL: Si no es tarjeta, borramos terminal y tipo
                                                                                if (nuevoMetodo !== MetodoPago.tarjeta) {
                                                                                    setValue(`pagos.${index}.numTerminal`, null); // O "" según tu preferencia
                                                                                    setValue(`pagos.${index}.tipoTarjeta`, null);
                                                                                }

                                                                                // 🟢 LIMPIEZA DE REFERENCIA: Si no es cupón, borramos la referencia
                                                                                // if (nuevoMetodo !== MetodoPago.cupon) {
                                                                                //     setValue(`pagos.${index}.referencia`, "");
                                                                                // }
                                                                            }}
                                                                            className={`w-full h-10 px-3 bg-zinc-50 rounded-xl text-[11px] font-bold outline-none cursor-pointer border ${hasPagoError?.metodo ? 'border-red-500 text-red-900' : 'border-transparent'}`}
                                                                        >
                                                                            {METODOS_PAGO_OPCIONES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                                                        </select>
                                                                    </div>

                                                                    {/* FACTURA SWITCH */}
                                                                    <div className="col-span-6 flex flex-col">
                                                                        {!metodosExcluidos.includes(watch(`pagos.${index}.metodo`)) && (
                                                                            <div className="animate-in fade-in duration-200">
                                                                                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1 mb-1">¿Factura?</label>
                                                                                <div
                                                                                    onClick={() => setValue(`pagos.${index}.requiereFactura`, !valorFacturaIndividual)}
                                                                                    className={`flex items-center justify-between px-4 h-10 rounded-xl border transition-all cursor-pointer ${valorFacturaIndividual ? 'bg-zinc-900 text-zinc-50 border-zinc-900' : 'bg-zinc-50 text-zinc-600 border-transparent'}`}
                                                                                >
                                                                                    <span className="text-[11px] font-bold uppercase">{valorFacturaIndividual ? 'Si' : 'No'}</span>
                                                                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${valorFacturaIndividual ? 'bg-zinc-700' : 'bg-zinc-200'}`}>
                                                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 ${valorFacturaIndividual ? 'left-4.5' : 'left-0.5'}`} />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* NOMBRE FACTURA (CONDICIONAL) */}
                                                                    {valorFacturaIndividual && (
                                                                        <div className="flex flex-col col-span-12 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                            <label className={`text-[10px] font-bold uppercase ml-1 mb-1 ${hasPagoError?.nombreFactura ? 'text-red-500' : 'text-zinc-400'}`}>Cliente / Empresa</label>
                                                                            <div className="relative">
                                                                                <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${hasPagoError?.nombreFactura ? 'text-red-400' : 'text-zinc-300'}`} size={16} />
                                                                                <input
                                                                                    {...register(`pagos.${index}.nombreFactura` as const, { required: valorFacturaIndividual })}
                                                                                    placeholder="Nombre o Razón Social"
                                                                                    className={`w-full h-10 pl-11 pr-4 bg-white border rounded-xl text-[11px] font-bold outline-none shadow-sm transition-all ${hasPagoError?.nombreFactura ? 'border-red-500 bg-red-50' : 'border-zinc-200 focus:border-zinc-900'}`}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* MONTO */}
                                                                    <div className="col-span-10">
                                                                        <label className={`text-[8px] font-black uppercase ml-1 ${hasPagoError?.monto ? 'text-red-500' : 'text-zinc-400'}`}>Monto</label>
                                                                        <div className="relative">
                                                                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs ${hasPagoError?.monto ? 'text-red-400' : 'text-zinc-400'}`}>$</span>
                                                                            <input
                                                                                type="number" step="0.01"
                                                                                onWheel={stopWheel}
                                                                                {...register(`pagos.${index}.monto` as const, { valueAsNumber: true, required: true, min: 0.01 })}
                                                                                className={`w-full h-10 pl-6 pr-3 bg-zinc-50 rounded-xl text-xs font-black outline-none border ${hasPagoError?.monto ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-span-10">
                                                                        <label className={`text-[8px] font-black uppercase ml-1 ${hasPagoError?.propina ? 'text-red-500' : 'text-zinc-400'}`}>Propina</label>
                                                                        <div className="relative">
                                                                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs ${hasPagoError?.propina ? 'text-red-400' : 'text-zinc-400'}`}>$</span>
                                                                            <input
                                                                                type="number" step="0.01"
                                                                                onWheel={stopWheel}
                                                                                {...register(`pagos.${index}.propina` as const, { valueAsNumber: true, required: true, min: 0 })}
                                                                                className={`w-full h-10 pl-6 pr-3 bg-zinc-50 rounded-xl text-xs font-black outline-none border ${hasPagoError?.monto ? 'border-red-500 bg-red-50' : 'border-transparent'}`}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* BOTÓN ELIMINAR */}
                                                                    <div className="col-span-2 flex justify-end pb-1">
                                                                        {fields.length > 1 && (
                                                                            <button type="button" onClick={() => remove(index)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {/* CAMPOS DE TARJETA (CONDICIONAL) */}
                                                                    {watch(`pagos.${index}.metodo`) === MetodoPago.tarjeta && (
                                                                        <div className="col-span-12 grid grid-cols-2 gap-4 mt-1 pt-3 border-t border-zinc-50 animate-in slide-in-from-top-1">
                                                                            <div className="flex flex-col space-y-1">
                                                                                <label className={`text-[8px] font-black uppercase ml-1 transition-colors ${hasPagoError?.numTerminal ? 'text-red-500' : 'text-zinc-400'}`}>
                                                                                    Terminal
                                                                                </label>
                                                                                <select
                                                                                    {...register(`pagos.${index}.numTerminal` as const, { required: true })}
                                                                                    className={`w-full h-9 px-3 rounded-xl text-[10px] font-black outline-none cursor-pointer border transition-all ${hasPagoError?.numTerminal ? 'border-red-500 bg-red-50 text-red-900' : 'bg-blue-50 text-blue-700 border-transparent focus:border-blue-200'}`}
                                                                                >
                                                                                    <option value="">Seleccionar Terminal</option>
                                                                                    {TERMINALES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                                                                </select>
                                                                            </div>
                                                                            <div className="flex flex-col space-y-1">
                                                                                <label className={`text-[8px] font-black uppercase ml-1 transition-colors ${hasPagoError?.tipoTarjeta ? 'text-red-500' : 'text-zinc-400'}`}>
                                                                                    Tipo Tarjeta
                                                                                </label>
                                                                                <select
                                                                                    {...register(`pagos.${index}.tipoTarjeta` as const, { required: true })}
                                                                                    className={`w-full h-9 px-3 rounded-xl text-[10px] font-black outline-none cursor-pointer border transition-all ${hasPagoError?.tipoTarjeta ? 'border-red-500 bg-red-50 text-red-900' : 'bg-blue-50 text-blue-700 border-transparent focus:border-blue-200'}`}
                                                                                >
                                                                                    <option value="">Tipo Tarjeta</option>
                                                                                    {Object.values(TipoTarjeta).map(t => <option key={t} value={t}>{t}</option>)}
                                                                                </select>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* OBSERVACIÓN */}
                                                                    <div className="col-span-12 flex flex-col pb-1">
                                                                        <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Observación</label>
                                                                        <input
                                                                            {...register(`pagos.${index}.referencia` as const)}
                                                                            placeholder="Nota (Opcional)"
                                                                            className="w-full h-10 px-4 bg-zinc-100 rounded-xl text-[10px] font-medium outline-none text-zinc-800 focus:bg-zinc-200 transition-all border-none"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}

                                                        {/* ACCIONES DEL FORMULARIO */}
                                                        <button type="button" onClick={() => append({ metodo: MetodoPago.efectivo, monto: faltante > 0 ? faltante : 0 })} className="w-full py-3 border-2 border-dashed border-emerald-200 text-emerald-600 rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-100 transition-all cursor-pointer">+ Agregar Pago</button>
                                                    </div>
                                                </div>
                                            </>
                                            : <div className="space-y-3 pb-4">
                                                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest italic">Desglose de Pago Inicial</p>
                                                <div className="bg-zinc-900 p-6 rounded-4xl text-white shadow-xl grid grid-cols-2 gap-4">
                                                    <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Monto Neto</label><p className="text-xl font-black">{formatCurrency(Number(selectedMovement.montoNeto))}</p></div>
                                                </div>
                                                <div className="space-y-2">
                                                    {selectedMovement.pagos.map((p: any, i: number) => {
                                                        console.log(p.folioFactura + "Gola");
                                                        console.log(p.folioIndividual);
                                                        const folioAsignado = p.folioFactura || p.folioIndividual;
                                                        const metodosBancarios = [MetodoPago.transferencia, MetodoPago.tarjeta, MetodoPago.p_deposito];
                                                        const tienePagoBancario = metodosBancarios.includes(p.metodo);
                                                        const requiereFacturaMov = p.requiereFactura;
                                                        return (
                                                            <div key={i} className="group animate-in fade-in slide-in-from-right-2 duration-300">
                                                                <div className="p-4 bg-white rounded-4xl border border-zinc-100 shadow-sm hover:shadow-md transition-all space-y-3">
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="p-2 bg-zinc-50 rounded-xl group-hover:bg-zinc-100 transition-colors">
                                                                                {p.metodo === "efectivo" ? (
                                                                                    <Wallet size={18} className="text-zinc-500" />
                                                                                ) : (
                                                                                    <CreditCard size={18} className="text-zinc-500" />
                                                                                )}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Método de Pago</p>
                                                                                <p className="text-sm font-black text-zinc-800 uppercase tracking-tight">{p.metodo.replace('_', ' ')}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="text-lg font-black text-zinc-900 tracking-tighter">{formatCurrency(Number(p.monto))}</span>
                                                                        </div>
                                                                    </div>

                                                                    {Number(p.propina) > 0 && (
                                                                        <div className="flex justify-between items-start">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="p-2 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
                                                                                    <Sparkles size={18} className="text-amber-500" />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none mb-1">Propina</p>
                                                                                    <p className="text-sm font-black text-amber-800 uppercase tracking-tight">Mesero</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <span className="text-lg font-black text-amber-800 tracking-tighter">{formatCurrency(Number(p.propina))}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                                                        {p.folioFactura || p.folioIndividual ? (
                                                                            // 1. Ya tiene Folio asignado
                                                                            <div className="flex flex-col items-center gap-0.5" title="Factura Emitida">
                                                                                <p className="text-[11px] font-black text-emerald-500 uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                                                    Factura Vinculada: <span className='text-emerald-900'>{p.folioFactura ? p.folioFactura : p.folioIndividual}</span>
                                                                                </p>
                                                                            </div>
                                                                        ) : requiereFacturaMov ? (
                                                                            // 2. El cliente la pidió pero no la han hecho
                                                                            <div className="flex flex-col items-center gap-0.5 opacity-80" title="Pendiente de Emitir">
                                                                                <Clock size={18} className="text-amber-500 mx-auto" />
                                                                                <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">
                                                                                    Requiere Factura
                                                                                </span>
                                                                            </div>
                                                                        ) : tienePagoBancario ? (
                                                                            // 3. Pagó con banco pero no pidió factura (Alerta visual)
                                                                            <div className="flex flex-col items-center gap-0.5 opacity-70" title="Ingreso Bancario sin Facturar">
                                                                                <XCircle size={18} className="text-red-400 mx-auto" />
                                                                                <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">
                                                                                    Requiere Factura Global
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            // 4. Efectivo / Cortesía sin factura solicitada
                                                                            <div className="flex flex-col items-center gap-0.5 opacity-40" title="Público en General">
                                                                                <MinusCircle size={18} className="text-zinc-400 mx-auto" />
                                                                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">
                                                                                    No Facturable
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {p.referencia && (
                                                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border italic ${p.metodo === "cupon" ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                                                <LinkIcon size={10} />
                                                                                <span>{p.metodo === "cupon" ? `Vinculado a recibo #${p.referencia}` : p.referencia}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        }
                                    </form>

                                    {/* Botones */}
                                    <div className="p-6 border-t border-zinc-100 bg-white/80 backdrop-blur-md sticky bottom-0 flex gap-3 z-50">
                                        {isEditing ? (
                                            <>
                                                <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-white border border-zinc-200 text-zinc-400 rounded-4xl font-black text-[10px] uppercase cursor-pointer hover:bg-zinc-50 transition-colors">Cancelar</button>
                                                <button form="master-edit-form" type="submit" disabled={!motivoSeleccionado || motivoDetalle?.length < 5 || faltante != 0} className="flex-2 py-4 bg-emerald-600 text-white rounded-4xl font-black text-[10px] uppercase shadow-lg disabled:bg-zinc-200 transition-all cursor-pointer hover:bg-emerald-700">Guardar Cambios Auditados</button>
                                            </>
                                        ) : (
                                            <div className="w-full flex flex-col gap-2">
                                                <button onClick={() => setIsEditing(true)} className="w-full py-4 bg-zinc-900 text-white rounded-4xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer hover:bg-black">
                                                    <Edit3 size={16} /> Editar Movimiento
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <DeleteMovementModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleDelete}
                    isLoading={isDeleting}
                />
            </div>
        </div>
    );
};