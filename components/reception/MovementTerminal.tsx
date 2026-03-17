"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { Bed, Utensils, Calendar, ShoppingBag, MapPin, CheckCircle2, User, ChevronDown, Sparkles, Plus, Trash2, AlertCircle, Loader2, Ban, MessageSquare } from 'lucide-react';
import { toast } from "sonner";
import { AreaType, MetodoPago, TerminalTipo, TipoTarjeta } from '@/lib/generated/prisma/enums';
import { createMovement } from '@/actions';
import { AreasEvento, MESEROS, METODOS_CON_FACTURA, METODOS_PAGO_OPCIONES, TERMINALES, TipoEvento } from '@/interfaces';

// --- TIPADOS ---
interface PagoInput {
    metodo: MetodoPago;
    monto: number;
    propina: number;
    requiereFactura: boolean;
    nombreFactura: string;
    numTerminal?: TerminalTipo | "";
    tipoTarjeta?: TipoTarjeta;
    referencia?: string;
}

interface MovementFormInput {
    documento: string;
    monto: number;
    descripcion?: string;
    pagos: PagoInput[];
    habitaciones?: string;
    mesero?: string;
    mesa?: string;
    comensales?: number;
    nombreCliente?: string;
    nombreSouvenir?: string;
    areaRentada?: string;
    tipoEvento?: string;
}

const AREAS_PRINCIPALES = [
    { id: 'hotel', label: 'Hotel', icon: Bed, enum: AreaType.HOTEL },
    { id: 'anticipo_hotel', label: 'Anticipo Hotel', icon: Bed, enum: AreaType.ANTICIPO_HOTEL },
    { id: 'restaurante', label: 'Restaurante', icon: Utensils, enum: AreaType.RESTAURANTE },
    { id: 'anticipo_rest', label: 'Anticipo Rest.', icon: Utensils, enum: AreaType.ANTICIPO_RESTAURANTE },
    { id: 'evento', label: 'Evento', icon: Calendar, enum: AreaType.EVENTO },
    { id: 'renta', label: 'Renta Espacios', icon: MapPin, enum: AreaType.RENTA_ESPACIOS },
    { id: 'souvenir', label: 'Souvenir', icon: ShoppingBag, enum: AreaType.SOUVENIR },
];

export const MovementTerminal = () => {
    const [activeArea, setActiveArea] = useState('hotel');
    const [openSelect, setOpenSelect] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const stopWheel = (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur();

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<MovementFormInput>({
        defaultValues: {
            monto: 0,
            descripcion: "",
            pagos: [{ metodo: MetodoPago.efectivo, monto: 0, propina: 0, requiereFactura: false, nombreFactura: "", referencia: "" }]
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: "pagos" });

    // Observadores
    const montoWatch = watch("monto");
    const pagosWatch = watch("pagos");
    // const isFactura = pagosWatch?.[0]?.requiereFactura || false;

    const isRestaurante = ['restaurante', 'anticipo_rest'].includes(activeArea);
    const tieneCreditoCobrar = pagosWatch.some(p => p.metodo === MetodoPago.credito_cobrar);

    const bloquearPropina = (activeArea === 'anticipo_rest') || (activeArea === 'restaurante' && tieneCreditoCobrar);

    useEffect(() => {
        if (bloquearPropina) setValue("pagos.0.propina", 0);
    }, [bloquearPropina, setValue]);

    useEffect(() => {
        pagosWatch.forEach((pago, index) => {
            const metodo = pago.metodo;

            // 1. Limpieza de Terminal (Si no es tarjeta)
            if (metodo !== MetodoPago.tarjeta) {
                setValue(`pagos.${index}.numTerminal`, "", { shouldValidate: false });
                setValue(`pagos.${index}.tipoTarjeta`, undefined, { shouldValidate: false });
            }

            // 2. Seguridad para Facturación
            // Si el método NO permite factura pero el switch está encendido, lo apagamos
            if (!METODOS_CON_FACTURA.includes(metodo) && pago.requiereFactura) {
                setValue(`pagos.${index}.requiereFactura`, false);
            }

            // 3. Limpieza de Nombre (Si el switch está apagado)
            if (!pago.requiereFactura) {
                setValue(`pagos.${index}.nombreFactura`, "");
            }

            // 4. Limpieza de Referencia (Si no es cupón y tiene datos de cupón)
            if (metodo !== MetodoPago.cupon && pago.referencia?.startsWith('8')) {
                setValue(`pagos.${index}.referencia`, "");
            }
        });
    }, [pagosWatch, setValue]);

    const mostrarCampoCliente = (['hotel', 'anticipo_hotel', 'anticipo_rest', 'evento', 'renta'].includes(activeArea)) ||
        (activeArea === 'restaurante' && (tieneCreditoCobrar));

    const totalNecesario = Number((Number(montoWatch) || 0).toFixed(2));
    const totalPagado = Number(pagosWatch.reduce((acc, curr) => acc + Number(curr.monto || 0) + Number(curr.propina) || 0, 0).toFixed(2));
    const diferencia = Number((totalNecesario - totalPagado).toFixed(2));

    const handleAreaChange = (areaId: string) => {
        reset({
            documento: "",
            monto: 0,
            descripcion: "",
            pagos: [{ metodo: MetodoPago.efectivo, monto: 0, requiereFactura: false, propina: 0, nombreFactura: "", referencia: "" }],
            habitaciones: "",
            mesero: "",
            mesa: "",
            comensales: 0,
            nombreCliente: "",
            nombreSouvenir: "",
            areaRentada: "",
            tipoEvento: ""
        });
        setActiveArea(areaId);
        setOpenSelect(null);
    };

    const onSubmit = async (data: MovementFormInput) => {
        setIsSubmitting(true);
        const areaSeleccionada = AREAS_PRINCIPALES.find(a => a.id === activeArea);

        const formattedData = {
            ...data,
            referencia: String(data.documento),
            area: areaSeleccionada?.enum as AreaType,
            montoNeto: Number(data.monto),
            descripcion: data.descripcion,
            comensales: data.comensales ? Number(data.comensales) : 0,
            pagos: data.pagos.map(p => ({
                ...p,
                monto: Number(p.monto),
                propina: Number(p.propina),
                requiereFactura: p.requiereFactura,
                nombreFactura: String(p.nombreFactura),
                numTerminal: p.metodo === MetodoPago.tarjeta ? (p.numTerminal || null) : null,
                tipoTarjeta: p.metodo === MetodoPago.tarjeta ? p.tipoTarjeta : null
            }))
        };

        const resp = await createMovement(formattedData as any);

        if (resp.ok) {
            toast.success("Movimiento guardado exitosamente");
            reset();
            setActiveArea('hotel');
        } else {
            toast.error(resp.message || "Error al guardar el movimiento");
        }
        setIsSubmitting(false);
    };

    const toggleSelect = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setOpenSelect(openSelect === id ? null : id);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white p-2 lg:p-6 rounded-[2.5rem] border border-zinc-100 shadow-2xl">
            {/* IZQUIERDA: SELECTOR */}
            <div className="lg:col-span-4 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-4 italic">Departamento</span>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                    {AREAS_PRINCIPALES.map((area) => (
                        <button
                            key={area.id}
                            type="button"
                            onClick={() => handleAreaChange(area.id)}
                            className={`flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer ${activeArea === area.id ? 'bg-zinc-900 text-white shadow-xl scale-[1.02]' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'}`}
                        >
                            <area.icon size={18} />
                            <span className="text-sm font-semibold">{area.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* DERECHA: FORMULARIO */}
            <div className="lg:col-span-8 bg-zinc-50/50 rounded-4xl p-6 lg:p-10 border border-zinc-100/50">
                <div className="flex flex-col gap-1 mb-8">
                    {/* Etiqueta de contexto superior */}
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 italic ml-1">
                        Registro de Movimiento
                    </span>

                    {/* Título Principal Dinámico */}
                    <h1 className="text-4xl font-black text-zinc-900 tracking-tighter leading-none uppercase">
                        {activeArea === "anticipo_hotel"
                            ? "Anticipo Hotel"
                            : activeArea === "anticipo_rest"
                                ? "Anticipo Restaurante"
                                : activeArea === "renta"
                                    ? "Renta de Espacios"
                                    : activeArea.replace('_', ' ')}
                    </h1>

                    {/* Subtítulo descriptivo según el área para evitar errores */}
                    <p className="text-sm text-zinc-500 font-medium italic ml-1">
                        {activeArea.includes('anticipo')
                            ? "Capture los datos del depósito o transferencia previa."
                            : `Gestión de ingresos para el área de ${activeArea.toLowerCase()}.`}
                    </p>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${errors.documento ? 'text-red-500' : 'text-zinc-400'}`}>Referencia</label>
                            <input {...register("documento", { required: true })} placeholder="Folio / Recibo" className={`w-full p-4 bg-white border rounded-2xl outline-none transition-all shadow-sm font-mono ${errors.documento ? 'border-red-500 bg-red-50' : 'border-zinc-200 focus:border-zinc-900'}`} />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${errors.monto ? 'text-red-500' : 'text-zinc-400'}`}>Monto Neto</label>
                            <div className="relative">
                                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold text-sm ${errors.monto ? 'text-red-400' : 'text-zinc-400'}`}>$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    onWheel={stopWheel}
                                    {...register("monto", {
                                        required: true,
                                        min: { value: 0, message: "El monto no puede ser negativo" },
                                        valueAsNumber: true
                                    })}
                                    className={`w-full py-4 pl-8 pr-4 bg-white border rounded-2xl outline-none transition-all shadow-sm font-mono ${errors.monto ? 'border-red-500 bg-red-50' : 'border-zinc-200 focus:border-zinc-900'}`}
                                />
                            </div>
                        </div>


                        {/* DESCRIPCIÓN */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1 flex items-center gap-1">
                                <MessageSquare size={10} /> Notas Adicionales
                            </label>
                            <textarea {...register("descripcion")} placeholder="Anote aquí detalles de cupones o notas adicionales (opcional)" className="w-full p-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:border-zinc-900 shadow-sm text-xs min-h-20 resize-none" />
                        </div>

                        {/* CAMPOS ESPECÍFICOS PARA EVENTOS O RENTA DE ESPACIOS */}
                        {['evento', 'renta'].includes(activeArea) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 flex items-center gap-1 ${errors.areaRentada ? 'text-red-500' : 'text-zinc-400'}`}>
                                        <MapPin size={10} /> Área / Salón
                                    </label>

                                    <select
                                        {...register("areaRentada", { required: true })}
                                        className={`w-full p-4 bg-white border rounded-2xl outline-none shadow-sm font-bold text-sm appearance-none cursor-pointer ${errors.areaRentada ? 'border-red-500 bg-red-50 text-red-900' : 'border-zinc-200 focus:border-zinc-900 text-gray-400'}`}
                                    >
                                        <option value="">Selecciona un lugar...</option>
                                        {AreasEvento.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 flex items-center gap-1 ${errors.tipoEvento ? 'text-red-500' : 'text-zinc-400'}`}>
                                        <Calendar size={10} /> Tipo de Evento
                                    </label>
                                    <select
                                        {...register("tipoEvento", { required: true })}
                                        className={`w-full p-4 bg-white border rounded-2xl outline-none shadow-sm font-bold text-sm appearance-none cursor-pointer ${errors.tipoEvento ? 'border-red-500 bg-red-50 text-red-900' : 'border-zinc-200 focus:border-zinc-900 text-gray-400'}`}
                                    >
                                        <option value="">Selecciona tipo...</option>
                                        {TipoEvento.map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}


                        {['hotel', 'anticipo_hotel'].includes(activeArea) && (
                            <div className="space-y-2 md:col-span-2">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${errors.habitaciones ? 'text-red-500' : 'text-zinc-400'}`}>Número de Habitaciones</label>
                                <input {...register("habitaciones", { required: true })} placeholder="Ej: 11, 12" className={`w-full p-4 bg-white border rounded-2xl outline-none shadow-sm ${errors.habitaciones ? 'border-red-500 bg-red-50' : 'border-zinc-200 focus:border-zinc-900'}`} />
                            </div>
                        )}

                        {activeArea === 'souvenir' && (
                            <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 italic flex items-center gap-1 ${errors.nombreSouvenir ? 'text-red-500' : 'text-zinc-400'}`}>
                                    <ShoppingBag size={10} /> ¿Qué se vendió?
                                </label>
                                <input
                                    {...register("nombreSouvenir", { required: activeArea === 'souvenir' })}
                                    placeholder="Ej: Artesanía de barro, Gorra..."
                                    className={`w-full p-4 bg-white border rounded-2xl outline-none shadow-sm ${errors.nombreSouvenir ? 'border-red-500 bg-red-50' : 'border-zinc-200 focus:border-zinc-900'}`}
                                />
                            </div>
                        )}

                        {mostrarCampoCliente && (
                            <div className="space-y-2 md:col-span-2">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 italic ${errors.nombreCliente ? 'text-red-500' : 'text-zinc-400'}`}>Cliente / Empresa</label>
                                <div className="relative">
                                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${errors.nombreCliente ? 'text-red-400' : 'text-zinc-300'}`} size={18} />
                                    <input {...register("nombreCliente", { required: true })} placeholder="Nombre del titular" className={`w-full pl-12 p-4 bg-white border rounded-2xl outline-none shadow-sm ${errors.nombreCliente ? 'border-red-500 bg-red-50' : 'border-zinc-200 focus:border-zinc-900'}`} />
                                </div>
                            </div>
                        )}

                        {isRestaurante && (
                            <>
                                <div className="space-y-2 relative">
                                    <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${errors.mesero ? 'text-red-500' : 'text-zinc-400'}`}>Mesero</label>
                                    <div onClick={(e) => toggleSelect(e, 'mesero')} className={`w-full p-4 bg-white border rounded-2xl flex justify-between items-center cursor-pointer shadow-sm ${errors.mesero ? 'border-red-500 bg-red-50' : 'border-zinc-200'}`}>
                                        <span className={`text-sm font-medium ${errors.mesero ? 'text-red-900' : ''}`}>{watch("mesero") || "Seleccionar..."}</span>
                                        <ChevronDown size={16} />
                                    </div>
                                    {openSelect === 'mesero' && (
                                        <div className="absolute top-[105%] left-0 w-full bg-white border border-zinc-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                                            {MESEROS.map(m => (
                                                <div key={m} onClick={() => { setValue("mesero", m, { shouldValidate: true }); setOpenSelect(null); }} className="p-4 hover:bg-zinc-900 hover:text-white cursor-pointer text-sm font-medium">{m}</div>
                                            ))}
                                        </div>
                                    )}
                                    <input type="hidden" {...register("mesero", { required: true })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4 space-y-2 py-2">
                                    <div className="flex flex-col">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Mesa</label>
                                        <input {...register("mesa", { required: true })} placeholder="Mesa" className={`w-full p-4 bg-white border rounded-2xl outline-none shadow-sm ${errors.mesa ? 'border-red-500 bg-red-50' : 'border-zinc-200 focus:border-zinc-900'}`} />
                                    </div>

                                    <div className="flex flex-col">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Comensales</label>
                                        <input {...register("comensales", { required: true })} type="number" onWheel={stopWheel} placeholder="Pax" className={`w-full p-4 bg-white border rounded-2xl outline-none shadow-sm ${errors.comensales ? 'border-red-500 bg-red-50' : 'border-zinc-200 focus:border-zinc-900'}`} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* PAGOS MIXTOS */}
                    <div className="space-y-4 pt-4 border-t border-zinc-100">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ">Desglose de Pago</label>
                            <button type="button" onClick={() => append({ metodo: MetodoPago.efectivo, monto: 0, propina: 0, requiereFactura: false, nombreFactura: "", referencia: "" })} className="flex items-center gap-2 text-[9px] font-black bg-zinc-900 text-white px-4 py-2 rounded-xl hover:bg-zinc-700 shadow-lg uppercase cursor-pointer transition-transform active:scale-95">
                                <Plus size={14} /> Añadir Pago
                            </button>
                        </div>
                        <div className="space-y-3">
                            {fields.map((field, index) => {
                                const valorFacturaIndividual = watch(`pagos.${index}.requiereFactura`);
                                const hasPagoError = errors.pagos?.[index];
                                const metodosExcluidos = [
                                    "credito_cobrar",
                                    "cupon",
                                    "cortesia_h",
                                    "cortesia_r",
                                    "credito_familiar",
                                    "efectivo"
                                ];

                                return (
                                    <div key={field.id} className="grid grid-cols-2 gap-4 items-end bg-white p-4 rounded-[1.8rem] border border-zinc-200 shadow-sm">
                                        <div className="col-span-2 flex items-center justify-end pr-2">
                                            {fields.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => remove(index)}
                                                    className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 cursor-pointer border border-red-100 shadow-sm"
                                                >
                                                    <span className="text-[10px] font-black uppercase tracking-tighter duration-200">Eliminar Pago</span>
                                                    <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="p-1 rounded-xl">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ">Metodo de pago</label>
                                            <select {...register(`pagos.${index}.metodo` as const)}
                                                onChange={(e) => {
                                                    const nuevoMetodo = e.target.value as MetodoPago;

                                                    // 1. Actualizamos el valor principal en el formulario
                                                    setValue(`pagos.${index}.metodo`, nuevoMetodo);

                                                    // 🟢 REGLA 1: Si el nuevo método NO permite factura, reseteamos switch y nombre
                                                    // Usamos la lista de constantes que definimos antes
                                                    if (!METODOS_CON_FACTURA.includes(nuevoMetodo)) {
                                                        setValue(`pagos.${index}.requiereFactura`, false);
                                                        setValue(`pagos.${index}.nombreFactura`, "");
                                                    }

                                                    // 🟢 REGLA 2: Si el nuevo método NO es tarjeta, limpiamos terminales
                                                    if (nuevoMetodo !== MetodoPago.tarjeta) {
                                                        setValue(`pagos.${index}.numTerminal`, "");
                                                        setValue(`pagos.${index}.tipoTarjeta`, undefined);
                                                    }

                                                    // 🟢 REGLA 3: Limpiar referencia si no es cupón
                                                    // Te recomiendo descomentarlo para que no se queden folios de cupones en otros pagos
                                                    // if (nuevoMetodo !== MetodoPago.cupon) {
                                                    //     setValue(`pagos.${index}.referencia`, "");
                                                    // }
                                                }}
                                                className="w-full p-3 bg-zinc-50 rounded-xl border-none text-xs font-bold appearance-none">
                                                {METODOS_PAGO_OPCIONES.map(m => (
                                                    <option key={m.id} value={m.id}>{m.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {!metodosExcluidos.includes(pagosWatch[index]?.metodo) && (
                                            <div className="flex flex-col">
                                                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1 ml-1">Factura</label>
                                                <div
                                                    onClick={() => setValue(`pagos.${index}.requiereFactura`, !valorFacturaIndividual)}
                                                    className={`flex items-center justify-between px-4 h-11.5 rounded-xl border transition-all cursor-pointer ${valorFacturaIndividual ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm' : 'bg-white border-zinc-200 text-zinc-600'}`}
                                                >
                                                    <span className="text-[11px] font-bold uppercase tracking-tight">¿Requiere Factura?</span>
                                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${valorFacturaIndividual ? 'bg-zinc-700' : 'bg-zinc-200'}`}>
                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 ${valorFacturaIndividual ? 'left-4.5' : 'left-0.5'}`} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {valorFacturaIndividual && (
                                            <div className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">
                                                <label className={`text-[9px] font-bold uppercase tracking-widest mb-1 ml-1 italic ${hasPagoError?.nombreFactura ? 'text-red-500' : 'text-zinc-400'}`}>Cliente / Empresa</label>
                                                <div className="relative">
                                                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${hasPagoError?.nombreFactura ? 'text-red-400' : 'text-zinc-300'}`} size={16} />
                                                    <input
                                                        {...register(`pagos.${index}.nombreFactura` as const, { required: valorFacturaIndividual })}
                                                        placeholder="Nombre del titular o Razón Social"
                                                        className={`w-full h-11.5 pl-11 pr-4 bg-white border rounded-xl text-[11px] font-bold outline-none shadow-sm transition-all ${hasPagoError?.nombreFactura ? 'border-red-500 bg-red-50' : 'border-zinc-200 focus:border-zinc-900'}`}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-1 rounded-xl">
                                            <label className={`text-[9px] font-bold uppercase tracking-widest ${hasPagoError?.monto ? 'text-red-500' : 'text-zinc-400'}`}>Monto</label>
                                            <div className="relative">
                                                <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-[20px] font-bold ${hasPagoError?.monto ? 'text-red-400' : ''}`}>$</span>
                                                <input type="number" step="0.01" onWheel={stopWheel} {...register(`pagos.${index}.monto` as const, { required: true, valueAsNumber: true })} className={`w-full p-3 rounded-[20px] border-none text-sm font-black text-center ${hasPagoError?.monto ? 'bg-red-50 text-red-900 placeholder:text-red-300' : 'bg-zinc-50'}`} />
                                            </div>
                                        </div>

                                        {isRestaurante && (
                                            <div className="flex flex-col animate-in fade-in duration-300">
                                                <label className={`text-[9px] font-bold uppercase tracking-widest mb-1 ml-1 italic flex items-center gap-1 ${bloquearPropina ? 'text-zinc-300' : 'text-amber-600'}`}>
                                                    {bloquearPropina ? <Ban size={10} /> : <Sparkles size={10} />} Propina
                                                </label>
                                                <div className="relative">
                                                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-black ${bloquearPropina ? 'text-zinc-300' : 'text-amber-500'}`}>$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        onWheel={stopWheel}
                                                        disabled={bloquearPropina}
                                                        {...register(`pagos.${index}.propina` as const, { valueAsNumber: true })}
                                                        className={`w-full h-11.5 pl-8 pr-4 rounded-xl outline-none transition-all text-[13px] font-black border ${bloquearPropina ? 'bg-zinc-100 border-zinc-100 text-zinc-400 cursor-not-allowed' : 'bg-amber-50/30 border-amber-100 text-amber-700 focus:bg-white'}`}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {pagosWatch[index]?.metodo === MetodoPago.tarjeta && (
                                            <>
                                                <div className="p-1 rounded-xl">
                                                    <label className={`text-[9px] font-bold uppercase tracking-widest ${hasPagoError?.numTerminal ? 'text-red-500' : 'text-zinc-400'}`}>Terminal</label>
                                                    <select
                                                        {...register(`pagos.${index}.numTerminal` as const, { required: true })}
                                                        className={`w-full p-4 rounded-xl border-none text-[12px] font-bold outline-none cursor-pointer ${hasPagoError?.numTerminal ? 'bg-red-50 text-red-900' : 'bg-zinc-50'}`}
                                                    >
                                                        <option value="">¿T-?</option>
                                                        {TERMINALES.map(t => <option key={t.id} value={t.id}>T-{t.label}</option>)}
                                                    </select>
                                                </div>
                                                <div className="p-1 rounded-xl">
                                                    <label className={`text-[9px] font-bold uppercase tracking-widest ${hasPagoError?.tipoTarjeta ? 'text-red-500' : 'text-zinc-400'}`}>Tipo tarjeta</label>
                                                    <select
                                                        {...register(`pagos.${index}.tipoTarjeta` as const, { required: true })}
                                                        className={`w-full p-4 rounded-xl border-none text-[10px] font-bold outline-none cursor-pointer ${hasPagoError?.tipoTarjeta ? 'bg-red-50 text-red-900' : 'bg-zinc-50'}`}
                                                    >
                                                        <option value="">¿Tipo?</option>
                                                        {Object.values(TipoTarjeta).map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        <div className="col-span-2 p-1 rounded-xl">
                                            {pagosWatch[index]?.metodo === MetodoPago.cupon ? (
                                                <div>
                                                    <label className={`text-[9px] font-bold uppercase tracking-widest ml-1 ${hasPagoError?.referencia ? 'text-red-600' : 'text-amber-500'}`}>Recibo del cupón</label>
                                                    <input
                                                        {...register(`pagos.${index}.referencia` as const, { required: true })}
                                                        placeholder="8XXX (Obligatorio)"
                                                        className={`w-full p-3 rounded-xl text-[10px] font-black italic shadow-inner outline-none ${hasPagoError?.referencia ? 'bg-red-50 border border-red-200 text-red-900' : 'bg-amber-50 border border-amber-200 text-amber-900'}`}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Observación</label>
                                                    <input
                                                        {...register(`pagos.${index}.referencia` as const, { required: false })}
                                                        placeholder="Nota (Opcional)"
                                                        className="w-full p-4 bg-zinc-100 rounded-xl text-[10px] font-medium outline-none text-zinc-800 focus:bg-zinc-200 transition-all"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* PIE DEL FORMULARIO */}
                    <div className={`p-8 rounded-[2.5rem] transition-all border-2 ${Math.abs(diferencia) < 0.01 ? 'bg-zinc-900 border-zinc-800 shadow-2xl' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
                            <div className="flex items-center gap-8">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total a Cobrar</p>
                                    <p className={`text-3xl font-black ${Math.abs(diferencia) < 0.01 ? 'text-white' : 'text-red-600'}`}>${totalNecesario.toFixed(2)}</p>
                                </div>
                                <div className="w-px h-10 bg-zinc-800 hidden md:block" />
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ingresado</p>
                                    <p className={`text-3xl font-black ${Math.abs(diferencia) < 0.01 ? 'text-white' : 'text-red-600'}`}>${totalPagado.toFixed(2)}</p>
                                </div>
                            </div>
                            {Math.abs(diferencia) < 0.01 ? (
                                <button disabled={isSubmitting} type="submit" className="w-full md:w-auto bg-white text-zinc-900 px-10 py-5 rounded-2xl font-black uppercase text-sm hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 cursor-pointer">
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <>Registrar <CheckCircle2 size={24} /></>}
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 text-red-600 animate-pulse bg-white/10 px-6 py-4 rounded-2xl border border-red-200/20">
                                    <AlertCircle size={20} />
                                    <span className="text-xs font-bold uppercase tracking-tighter">Diferencia de ${Math.abs(diferencia).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};