"use client";

import { useMemo, useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import {
    Search, X, Trash2, LinkIcon, Info, CreditCard, Loader2,
    User, CheckCircle2, XCircle, Wallet, AlertCircle,
    PersonStanding,
    Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

import { METODOS_CON_FACTURA, MovimientoCompleto } from '@/interfaces';
import { AreaGroup, KPICard } from './movement-ui';
import { useUIStore } from '@/store';
import { usePagoStore } from '@/store/pago-store';
import { MetodoPago, TerminalTipo, TipoTarjeta } from '@/lib/generated/prisma/enums';
import { pagarCredito, revertirLiquidacion } from '@/actions';
import clsx from 'clsx';
import { DeleteFacturaModal } from './facturas/DeleteFacturaModal';

interface Props {
    movements: MovimientoCompleto[];
    currentFiltro: any;
    currentSearch: string;
    currentInicio: string;
    currentFin: string;
}

interface LiquidacionFormData {
    pagos: {
        metodo: MetodoPago;
        monto: number;
        propina: number;
        requiereFactura: boolean;
        nombreFactura: string;
        numTerminal?: TerminalTipo | "";
        tipoTarjeta?: TipoTarjeta;
        referencia?: string;
    }[];
}
type EstadoFiltro = 'todos' | 'pagados' | 'pendientes';

export const CreditosClientView = ({
    movements, currentFiltro,
    currentSearch, currentInicio, currentFin
}: Props) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Zustand
    const { isDetailOpen, selectedMovement, openDetail, closeDetail } = useUIStore();
    const { updatePagos, setTotalADebuer, getResumen, resetPagoStore } = usePagoStore();
    const { faltante, listoParaLiquidar } = getResumen();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showLiquidacionForm, setShowLiquidacionForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [localInicio, setLocalInicio] = useState(currentInicio);
    const [localFin, setLocalFin] = useState(currentFin);
    const [localSearch, setLocalSearch] = useState(currentSearch);
    const [loadingData, setLoadingData] = useState(false);

    const onConfirmDelete = async (motivo: string) => {
        if (!selectedMovement) return;

        setLoading(true);
        try {
            // 🟢 Llamamos al Action de reversión
            const res = await revertirLiquidacion(selectedMovement.id, motivo);

            if (res.ok) {
                toast.success(res.message);
                setIsModalOpen(false);
                closeDetail(); // Cerramos el drawer ya que los datos cambiaron
                router.refresh(); // Refrescamos la página para ver el estatus "Pendiente"
            } else {
                // Aquí saldrá el alert de las facturas si el action falla por eso
                toast.error(res.message, {
                    duration: 5000,
                });
            }
        } catch (error) {
            toast.error("Error de comunicación con el servidor");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // 🟢 Cuando llegan nuevos movimientos (o la misma lista vacía),
        // liberamos el botón de carga.
        setLocalInicio(currentInicio);
        setLocalFin(currentFin);
        setLocalSearch(currentSearch);
        setLoadingData(false); // <--- Liberación del botón
    }, [currentInicio, currentFin, currentSearch, movements]);

    // Formulario
    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<LiquidacionFormData>({
        mode: "onChange",
        defaultValues: {
            pagos: [{ metodo: MetodoPago.efectivo, monto: 0, propina: 0, requiereFactura: false, nombreFactura: "", referencia: "" }] // Inicializar como arreglo vacío para evitar errores de .reduce
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: "pagos" });
    const watchPagos = watch("pagos");
    const stopWheel = (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur();

    const PAGO_DEFAULT = {
        metodo: MetodoPago.efectivo,
        monto: 0,
        propina: 0,
        requiereFactura: false,
        nombreFactura: "",
        referencia: "",
    } satisfies LiquidacionFormData["pagos"][number];

    // Sincronización inmediata con Zustand
    useEffect(() => {
        updatePagos(watchPagos);
    }, [watchPagos, updatePagos]);

    useEffect(() => {
        if (selectedMovement) {
            setTotalADebuer(Number(selectedMovement.montoNeto));
        }
    }, [selectedMovement, setTotalADebuer]);

    useEffect(() => {
        if (selectedMovement) {
            const monto = Number(selectedMovement.montoNeto);
            setTotalADebuer(monto);

            reset({
                pagos: [{
                    metodo: MetodoPago.efectivo,
                    monto: monto, // Sugerimos el total automáticamente
                    propina: 0,
                    requiereFactura: false,
                    nombreFactura: "",
                    referencia: ""
                }]
            });
        }
    }, [selectedMovement, reset, setTotalADebuer]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

    const onLiquidar = async (data: any) => {
        if (!listoParaLiquidar) return toast.error(`Monto incorrecto. Diferencia: ${formatCurrency(faltante)}`);

        setIsLoading(true);
        try {
            const res = await pagarCredito(selectedMovement!.id, data.pagos);
            if (res.ok) {
                toast.success("Crédito liquidado exitosamente");
                setShowLiquidacionForm(false);
                closeDetail();
                resetPagoStore();
                reset();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Error en la conexión con el servidor");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyFilters = (newFiltro?: string) => {
        setLoadingData(true);
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', '1');

        // 🟢 Usamos los estados locales en lugar de los props
        params.set('inicio', localInicio);
        params.set('fin', localFin);

        if (localSearch) params.set('search', localSearch);
        else params.delete('search');

        // Si pasamos un filtro (ej. al picar 'pagados'), lo usamos, si no, el actual
        if (newFiltro) params.set('filtro', newFiltro);

        router.push(`${pathname}?${params.toString()}`);
    };

    const stats = useMemo(() => {
        const porCobrar = movements.filter(m => !m.pagado).reduce((acc, curr) => acc + (Number(curr.montoNeto)), 0);
        const recuperadoTotal = movements.filter(m => m.pagado).reduce((acc, curr) => acc + (Number(curr.montoNeto)), 0);
        return { porCobrar, recuperadoTotal };
    }, [movements]);

    const handleMetodoChange = (index: number, nuevoMetodo: MetodoPago) => {
        // 1. Actualizamos el método
        setValue(`pagos.${index}.metodo`, nuevoMetodo);

        // 2. Limpieza inmediata si NO es tarjeta
        if (nuevoMetodo !== MetodoPago.tarjeta) {
            setValue(`pagos.${index}.numTerminal`, "");
            setValue(`pagos.${index}.tipoTarjeta`, undefined);
        }

        // 3. Limpieza de factura si el método no lo permite
        if (!METODOS_CON_FACTURA.includes(nuevoMetodo)) {
            setValue(`pagos.${index}.requiereFactura`, false);
            setValue(`pagos.${index}.nombreFactura`, "");
        }
    };

    return (
        <div className="space-y-6">
            <DeleteFacturaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={onConfirmDelete}
                isLoading={loading}
                isFactura={false}
            />
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <KPICard
                    title="Saldo Pendiente"
                    subtitle="Créditos activos por recuperar"
                    amount={stats.porCobrar}
                    icon={<AlertCircle size={22} />}
                    color="bg-rose-600"
                />

                <KPICard
                    title="Monto Recuperado"
                    subtitle="Pagos aplicados a créditos"
                    amount={stats.recuperadoTotal}
                    icon={<CheckCircle2 size={22} />}
                    color="bg-emerald-600"
                    isMain
                />
            </div>

            {/* Filtros */}
            {/* Filtros */}
            <div className="bg-white p-4 rounded-[2.5rem] border border-zinc-100 shadow-xl space-y-4 lg:space-y-0 lg:flex lg:items-center lg:gap-4">

                {/* Selector de Estatus (Filtro rápido) */}
                <div className="grid grid-cols-3 bg-zinc-100 p-1 rounded-2xl shrink-0 w-full lg:w-80">
                    {(['todos', 'pendientes', 'pagados'] as const).map((opcion) => (
                        <button
                            key={opcion}
                            onClick={() => handleApplyFilters(opcion)}
                            className={clsx(
                                // 🟢 Se quitó px-4 y se puso w-full para que el grid controle el tamaño
                                "w-full py-2 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer",
                                currentFiltro === opcion ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400'
                            )}
                        >
                            {opcion}
                        </button>
                    ))}
                </div>

                {/* Buscador */}
                <div className="relative grid grid-cols-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                        type="text"
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                        placeholder="Folio o cliente..."
                        className="w-full pl-11 pr-4 py-3 bg-zinc-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-zinc-200 transition-all"
                    />
                </div>

                {/* 🟢 Rango de Fechas Inline (Agregado) */}
                <div className="grid grid-cols-2 gap-1 bg-zinc-50 p-1 rounded-2xl border border-zinc-100 shrink-0 w-full lg:w-72">
                    <div className="flex flex-col border-r border-zinc-200/60">
                        <span className="text-[8px] font-black text-zinc-400 uppercase ml-2 mt-1">Inicio</span>
                        <input
                            type="date"
                            value={localInicio}
                            onChange={(e) => setLocalInicio(e.target.value)}
                            className="bg-transparent p-2 pt-0 text-xs font-bold outline-none cursor-pointer text-zinc-700 w-full"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-zinc-400 uppercase ml-2 mt-1">Fin</span>
                        <input
                            type="date"
                            value={localFin}
                            min={localInicio}
                            onChange={(e) => setLocalFin(e.target.value)}
                            className="bg-transparent p-2 pt-0 text-xs font-bold outline-none cursor-pointer text-zinc-700 w-full"
                        />
                    </div>
                </div>

                {/* 🟢 Botón Cargar Datos (Agregado) */}
                <button
                    onClick={() => handleApplyFilters()}
                    disabled={loadingData}
                    className="grid grid-cols-1 lg:w-auto px-8 py-3.5 bg-zinc-900 text-white rounded-2xl font-black text-[11px] uppercase items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
                >
                    {loadingData ? <Loader2 className="animate-spin" size={16} /> : "Mostrar Información"}
                </button>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl overflow-hidden">

                {/* 2. Este es el contenedor "mágico": permite el scroll horizontal en celulares */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                                <th className="p-6">Movimiento</th>
                                <th className="p-6">Cliente</th>
                                <th className="p-6">Total</th>
                                <th className="p-6">Estatus</th>
                                <th className="p-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {movements.length === 0 ? (
                                <tr><td colSpan={5} className="p-20 text-center italic text-zinc-400">No se encontraron créditos.</td></tr>
                            ) : (
                                Object.entries(movements.reduce((acc, mov) => {
                                    if (!acc[mov.area]) acc[mov.area] = [];
                                    acc[mov.area].push(mov);
                                    return acc;
                                }, {} as Record<string, MovimientoCompleto[]>)).map(([area, movs]) => (
                                    <AreaGroup key={area} area={area} movs={movs} formatCurrency={formatCurrency} onOpenDetails={(m) => { openDetail(m); setShowLiquidacionForm(false); }} credito={true} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Lateral */}
            <div className={`fixed inset-0 z-50 flex justify-end transition-all ${isDetailOpen ? 'visible' : 'invisible'}`}>
                <div className={`absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-500 ${isDetailOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => { closeDetail(); setShowLiquidacionForm(false); resetPagoStore(); }} />

                <div className={`relative w-full max-w-lg bg-zinc-50 h-screen shadow-2xl transition-transform duration-500 transform ${isDetailOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col overflow-y-auto`}>
                    {selectedMovement && (
                        <div className="flex flex-col h-full">
                            {/* CABECERA Y DATOS DEL MOVIMIENTO (Lo que pediste re-agregar) */}
                            <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-black text-zinc-900 italic">{isEditing ? 'Editar Registro' : 'Detalle de Movimiento'}</h2>
                                    <button
                                        onClick={() => {
                                            closeDetail();
                                            setShowLiquidacionForm(false);
                                            resetPagoStore(); // 🟢 Limpia las sumas de Zustand
                                            reset();          // 🟢 Limpia el formulario de RHF
                                        }}
                                        className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>





                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-zinc-400"># Recibo/Comanda</label>
                                        <p className="text-sm font-bold text-zinc-900">{selectedMovement.referencia.replace(/^R-/i, '')}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-zinc-400">Cliente</label>
                                        <p className="text-sm font-bold text-zinc-900">{selectedMovement.nombreCliente || 'General'}</p>
                                    </div>
                                </div>

                                {selectedMovement.descripcion && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Notas / Motivo del Crédito</label>
                                        <p className="w-full text-sm font-bold text-zinc-900 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">{selectedMovement.descripcion}</p>
                                    </div>
                                )}

                                {/* DETALLES POR ÁREA */}
                                {/* DETALLES POR ÁREA */}
                                <div className="p-4 bg-zinc-50 rounded-3xl space-y-4 border border-zinc-100">
                                    <p className="text-[10px] font-black uppercase text-zinc-400 italic flex items-center gap-2"><Info size={12} /> Detalles {selectedMovement.area}</p>
                                    <div className="grid grid-cols-12 gap-3">
                                        {selectedMovement.area.includes('HOTEL') && (
                                            <div className="col-span-12 space-y-1">
                                                <label className="text-[11px] font-bold text-zinc-400 uppercase ml-1">Número(s) de habitación</label>
                                                <p className="text-xs font-black px-1">{selectedMovement.detalleHotel?.habitaciones}</p>
                                            </div>
                                        )}
                                        {selectedMovement.area.includes('RESTAURANTE') && (
                                            <>
                                                <div className="col-span-4 space-y-1">
                                                    <label className="text-[11px] font-bold text-zinc-400 uppercase ml-1">Mesero</label>
                                                    <p className="text-xs font-black px-1">{selectedMovement.detalleRestaurante?.mesero}</p>
                                                </div>
                                                <div className="col-span-4 space-y-1">
                                                    <label className="text-[11px] font-bold text-zinc-400 uppercase ml-1">Mesa</label>
                                                    <p className="text-xs font-black px-1">{selectedMovement.detalleRestaurante?.mesa}</p>
                                                </div>
                                                <div className="col-span-4 space-y-1">
                                                    <label className="text-[11px] font-bold text-zinc-400 uppercase ml-1">Comensales</label>
                                                    <p className="text-xs font-black px-1">{selectedMovement.detalleRestaurante?.comensales}</p>
                                                </div>
                                            </>
                                        )}
                                        {selectedMovement.detalleEvento && (
                                            <>
                                                <div className="col-span-6 space-y-1">
                                                    <label className="text-[11px] font-bold text-zinc-400 uppercase ml-1">Área Rentada</label>
                                                    <p className="text-xs font-black px-1">{selectedMovement.detalleEvento?.areaRentada}</p>
                                                </div>
                                                <div className="col-span-6 space-y-1">
                                                    <label className="text-[11px] font-bold text-zinc-400 uppercase ml-1">Tipo Evento</label>
                                                    <p className="text-xs font-black px-1">{selectedMovement.detalleEvento?.tipoEvento}</p>
                                                </div>
                                            </>
                                        )}
                                        {selectedMovement.detalleSouvenir && (
                                            <div className="col-span-12 space-y-1">
                                                <label className="text-[11px] font-bold text-zinc-400 uppercase ml-1">Nombre</label>
                                                <p className="text-xs font-black px-1">{selectedMovement.detalleSouvenir?.nombre}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* RESUMEN FINANCIERO */}


                                {/* PAGOS APLICADOS (ORIGINALES) */}
                                <div className="space-y-3 pb-4">
                                    <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest italic">Desglose de Pago Inicial</p>
                                    {/* <div className={`${selectedMovement.pagado ? "bg-green-600" : "bg-red-600"} p-6 rounded-4xl text-white shadow-xl grid grid-cols-2 gap-4`}>
                                        <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Monto Neto</label><p className="text-xl font-black">{formatCurrency(Number(selectedMovement.montoNeto))}</p></div>
                                    </div> */}
                                    <div className="space-y-2">
                                        {selectedMovement.pagos.map((p, i) => (
                                            <div key={i} className="group animate-in fade-in slide-in-from-right-2 duration-300">
                                                <div className={clsx("p-4  rounded-4xl border shadow-sm hover:shadow-md transition-all space-y-3", {
                                                    "bg-white border-zinc-100":
                                                        p.metodo !== "credito_cobrar",

                                                    "bg-green-200 border-green-200":
                                                        p.metodo === "credito_cobrar" && selectedMovement.pagado,

                                                    "bg-red-200 border-red-200":
                                                        p.metodo === "credito_cobrar" && !selectedMovement.pagado,
                                                })}>
                                                    {/* Fila Principal: Método y Monto */}
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-3">
                                                            <div className={clsx("p-2 rounded-xl transition-colors", {
                                                                "bg-zinc-50 group-hover:bg-zinc-100":
                                                                    p.metodo !== "credito_cobrar",

                                                                "bg-green-200 group-hover:bg-green-300":
                                                                    p.metodo === "credito_cobrar" && selectedMovement.pagado,

                                                                "bg-red-200 group-hover:bg-red-300":
                                                                    p.metodo === "credito_cobrar" && !selectedMovement.pagado,
                                                            })}>
                                                                {p.metodo === "efectivo" ? (
                                                                    <Wallet size={18} className="text-zinc-500" />
                                                                ) : (
                                                                    <CreditCard size={18} className={clsx({
                                                                        "text-zinc-500":
                                                                            p.metodo !== "credito_cobrar",
                                                                        "text-green-600":
                                                                            p.metodo === "credito_cobrar" && selectedMovement.pagado,
                                                                        "text-red-600":
                                                                            p.metodo === "credito_cobrar" && !selectedMovement.pagado,
                                                                    })} />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className={clsx("text-[10px] font-black uppercase tracking-widest leading-none mb-1", {
                                                                    "text-zinc-400":
                                                                        p.metodo !== "credito_cobrar",
                                                                    "text-green-500":
                                                                        p.metodo === "credito_cobrar" && selectedMovement.pagado,
                                                                    "text-red-500":
                                                                        p.metodo === "credito_cobrar" && !selectedMovement.pagado,
                                                                })}>
                                                                    {p.metodo != "credito_cobrar" ? "Método de Pago" : p.metodo === "credito_cobrar" && selectedMovement.pagado ? "Pagado" : "Listo Para Pagar"}
                                                                </p>
                                                                <p className={clsx("text-sm font-black uppercase tracking-tight", {
                                                                    "text-zinc-800":
                                                                        p.metodo !== "credito_cobrar",
                                                                    "text-green-800":
                                                                        p.metodo === "credito_cobrar" && selectedMovement.pagado,
                                                                    "text-red-800":
                                                                        p.metodo === "credito_cobrar" && !selectedMovement.pagado,
                                                                })}>
                                                                    {p.metodo.replace('_', ' ')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={clsx("text-lg font-black tracking-tighter", {
                                                                "text-zinc-900":
                                                                    p.metodo !== "credito_cobrar",
                                                                "text-green-900":
                                                                    p.metodo === "credito_cobrar" && selectedMovement.pagado,
                                                                "text-red-900":
                                                                    p.metodo === "credito_cobrar" && !selectedMovement.pagado,
                                                            })}>
                                                                {p.metodo != "credito_cobrar" ? formatCurrency(Number(p.monto)) : formatCurrency(Number(p.monto))}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {
                                                        Number(p.propina) > 0 && (
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
                                                                        <Sparkles size={18} className="text-amber-500" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none mb-1">
                                                                            Propina
                                                                        </p>
                                                                        <p className="text-sm font-black text-amber-800 uppercase tracking-tight">
                                                                            Mesero
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-lg font-black text-amber-800 tracking-tighter">
                                                                        {formatCurrency(Number(p.propina))}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )
                                                    }


                                                    {/* Fila Secundaria: Factura y Referencia */}
                                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                                        {/* Badge de Factura más elegante */}
                                                        {p.metodo !== "credito_cobrar" && (
                                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border
                                                                ${p.requiereFactura
                                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                    : 'bg-red-50 text-red-600 border-red-100'}`
                                                            }>
                                                                {p.requiereFactura ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                                {p.requiereFactura ? 'Factura Solicitada' : 'No Requiere Factura'}
                                                            </div>
                                                        )}

                                                        {p.requiereFactura && (
                                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border bg-gray-50 text-gray-600 border-gray-100`}>
                                                                <PersonStanding size={10} /> {p.nombreFactura}
                                                            </div>
                                                        )}

                                                        {/* Referencia/Estado dentro de la misma línea visual */}
                                                        {p.referencia && (
                                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border italic
                                                                ${p.metodo === "cupon"
                                                                    ? 'bg-orange-50 text-orange-600 border-orange-100'
                                                                    : 'bg-blue-50 text-blue-600 border-blue-100'}`
                                                            }>
                                                                <LinkIcon size={10} />
                                                                <span>
                                                                    {p.metodo === "cupon" ? `Vinculado a recibo #${p.referencia}` : p.referencia}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* SECCIÓN DE LIQUIDACIÓN DINÁMICA */}
                                <div className="pt-4 border-t border-zinc-100">
                                    {!selectedMovement.pagado && !showLiquidacionForm && (
                                        <button onClick={() => { setShowLiquidacionForm(true); reset({ pagos: [{ metodo: MetodoPago.efectivo, monto: (Number(selectedMovement.montoNeto)) }] }); }} className="w-full py-4 bg-emerald-600 text-white rounded-3xl font-black uppercase text-xs shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                                            <CreditCard size={18} /> Registrar Liquidación
                                        </button>
                                    )}

                                    {selectedMovement.pagado && !showLiquidacionForm &&
                                        <>
                                            {loading ? <Loader2 className="animate-spin" /> : (
                                                <>
                                                    <button disabled={loading} onClick={() => setIsModalOpen(true)} className="w-full py-4 bg-rose-600 text-white rounded-3xl font-black uppercase text-xs shadow-lg hover:bg-rose-700 transition-all flex items-center justify-center gap-2">
                                                        <Trash2 size={18} /> Revertir Pagos Del Crédito
                                                    </button>
                                                </>
                                            )}
                                        </>

                                    }

                                    {showLiquidacionForm && (
                                        <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100 space-y-4 animate-in fade-in zoom-in-95">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-[10px] font-black uppercase text-emerald-700">Liquidación de Deuda</h3>
                                                <div className={`px-4 py-1 rounded-full text-[10px] font-black ${listoParaLiquidar ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                                    {listoParaLiquidar ? "TOTAL CUBIERTO" : `FALTA: ${formatCurrency(faltante)}`}
                                                </div>
                                            </div>

                                            <form onSubmit={handleSubmit(onLiquidar)} className="space-y-3">
                                                {fields.map((field, index) => {
                                                    const valorFacturaIndividual = watch(`pagos.${index}.requiereFactura`);
                                                    const hasPagoError = errors.pagos?.[index];
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
                                                                    onChange={(e) => handleMetodoChange(index, e.target.value as MetodoPago)} // 🟢 Llamada a la limpieza
                                                                    className={`w-full h-10 px-3 bg-zinc-50 rounded-xl text-[11px] font-bold outline-none cursor-pointer border ${hasPagoError?.metodo ? 'border-red-500 text-red-900' : 'border-transparent'}`}
                                                                >
                                                                    <option value={MetodoPago.efectivo}>Efectivo</option>
                                                                    <option value={MetodoPago.p_deposito}>Para Deposito</option>
                                                                    <option value={MetodoPago.tarjeta}>Tarjeta</option>
                                                                    <option value={MetodoPago.transferencia}>Transferencia</option>
                                                                    <option value={MetodoPago.cortesia_h}>Cortesía Hotel</option>
                                                                    <option value={MetodoPago.cortesia_r}>Cortesía Restaurante</option>
                                                                    <option value={MetodoPago.credito_familiar}>Crédito Familiar</option>
                                                                    <option value={MetodoPago.cupon}>Cupon</option>
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
                                                                <div className="col-span-12 grid grid-cols-2 gap-2 mt-1 pt-3 border-t border-zinc-50 animate-in slide-in-from-top-1">
                                                                    <select
                                                                        {...register(`pagos.${index}.numTerminal` as const, { required: true })}
                                                                        className={`p-2.5 rounded-xl text-[10px] font-black outline-none cursor-pointer border ${hasPagoError?.numTerminal ? 'border-red-500 bg-red-50' : 'bg-blue-50 text-blue-700 border-transparent'}`}
                                                                    >
                                                                        <option value="">Seleccionar Terminal</option>
                                                                        <option value={TerminalTipo.T_4303851}>Terminal 4303851</option>
                                                                        <option value={TerminalTipo.T_4449999}>Terminal 4449999</option>
                                                                    </select>
                                                                    <select
                                                                        {...register(`pagos.${index}.tipoTarjeta` as const, { required: true })}
                                                                        className={`p-2.5 rounded-xl text-[10px] font-black outline-none cursor-pointer border ${hasPagoError?.tipoTarjeta ? 'border-red-500 bg-red-50' : 'bg-blue-50 text-blue-700 border-transparent'}`}
                                                                    >
                                                                        <option value="">Tipo Tarjeta</option>
                                                                        {Object.values(TipoTarjeta).map(t => <option key={t} value={t}>{t}</option>)}
                                                                    </select>
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
                                                <button type="button" onClick={() => append({ ...PAGO_DEFAULT, monto: faltante })} className="w-full py-3 border-2 border-dashed border-emerald-200 text-emerald-600 rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-100 transition-all cursor-pointer">
                                                    + Agregar pago
                                                </button>

                                                <button type="submit" disabled={isLoading || Math.abs(faltante) > 0.01 || !listoParaLiquidar} className="w-full py-4 bg-zinc-900 text-white rounded-3xl font-black uppercase text-xs shadow-xl disabled:opacity-20 flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all cursor-pointer">
                                                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : "Finalizar Liquidación"}
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};