"use client";

import { useState, useMemo, useEffect } from 'react';
import {
    Search, Loader2, CreditCard, Landmark, DollarSign, Info,
    CheckCircle2
} from 'lucide-react';
import { TipoFactura, AreaType } from '@/lib/generated/prisma/enums';
import { getPendingPayments, createFactura } from '@/actions';
import { toast } from "sonner";
import { usePagoStore } from '@/store';
import { PagoFactura } from '@/interfaces';
import { formatCurrency } from '../../utils/format-currency';

export const FacturasClientView = () => {
    // --- ESTADOS ---
    const [areaFiltro, setAreaFiltro] = useState<'HOTEL' | 'RESTAURANTE' | 'EVENTOS' | 'RENTA ESPACIOS' | 'SOUVENIR' | '16%' | 'TODAS'>('16%');
    const hoyMexico = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    const [fecha, setFecha] = useState(hoyMexico);
    const [pendingPayments, setPendingPayments] = useState<PagoFactura[]>([]);
    const [loading, setLoading] = useState(false);
    const [folioFiscal, setFolioFiscal] = useState("");

    const [montoAFacturar, setMontoAFacturar] = useState<number>(0);
    const [tipoFactura, setTipoFactura] = useState<'GLOBAL' | 'INDIVIDUAL' | 'TODAS'>('TODAS');
    const [tipoFacturaCre, setTipoFacturaCre] = useState<TipoFactura>(TipoFactura.GLOBAL);
    const stopWheel = (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur();

    const { selectedPagoIds, togglePagoSelection, resetPagoStore } = usePagoStore();

    // const isSingleSelection = useMemo(() => {
    //     return tipoFactura === TipoFactura.INDIVIDUAL;
    // }, [tipoFactura]);
    const isSingleSelection = useMemo(() => {
        return false;
    }, []);

    useEffect(() => {
        // 🟢 Calculamos el saldo pendiente total de TODOS los pagos seleccionados
        if (selectedPagoIds.length > 0) {
            const totalPendienteSuma = selectedPagoIds.reduce((acc, id) => {
                const pago = pendingPayments.find(p => p.id === id);
                if (!pago) return acc;

                const totalPago = Number(pago.monto) + Number(pago.propina);
                const yaFacturado = pago.facturasVinculadas?.reduce((sum, v) => sum + Number(v.monto), 0) || 0;
                return acc + (totalPago - yaFacturado);
            }, 0);

            setMontoAFacturar(Number(totalPendienteSuma.toFixed(2)));
        } else {
            setMontoAFacturar(0);
        }
    }, [selectedPagoIds, pendingPayments]);

    // useEffect(() => {
    //     if (isSingleSelection && selectedPagoIds.length === 1) {
    //         const pago = pendingPayments.find(p => p.id === selectedPagoIds[0]);
    //         if (pago) {
    //             const totalPago = Number(pago.monto) + Number(pago.propina);
    //             // 🟢 Calculamos el acumulado de facturas previas
    //             const yaFacturado = pago.facturasVinculadas?.reduce((acc, v) => acc + Number(v.monto), 0) || 0;

    //             // 🟢 El valor inicial será SOLO lo que falta (ej: 3000 - 2000 = 1000)
    //             const saldoPendiente = Number((totalPago - yaFacturado).toFixed(2));
    //             setMontoAFacturar(saldoPendiente);
    //         }
    //         // else {
    //         //     setMontoAFacturar(0);
    //         // }
    //     }
    // }, [selectedPagoIds, isSingleSelection, pendingPayments]);

    const handleSearch = async () => {
        setLoading(true);
        resetPagoStore();
        const res = await getPendingPayments({
            tipoFactura,
            areaGroup: areaFiltro,
            fecha
        });
        if (res.ok) setPendingPayments(res.payments || []);
        else toast.error("Error al cargar pagos");
        setLoading(false);
    };

    useEffect(() => {
        // Solo autocompletamos si el input está vacío o si el usuario
        // no ha empezado a escribir números todavía (para no borrarle su trabajo).
        const hasNumbers = /\d/.test(folioFiscal);

        if (!hasNumbers) {
            let prefijo = "";

            if (areaFiltro === 'TODAS') {
                prefijo = "";
            } else if (areaFiltro === 'HOTEL') {
                prefijo = tipoFacturaCre === TipoFactura.GLOBAL ? "FGH-" : "HH-";
            } else {
                // Restaurante, Eventos, Rentas, Souvenir, etc.
                prefijo = tipoFacturaCre === TipoFactura.GLOBAL ? "FGR-" : "HR-";
            }

            setFolioFiscal(prefijo);
        }
    }, [areaFiltro, tipoFacturaCre]);

    const [ajusteManual, setAjusteManual] = useState(0);

    // Reseteamos el ajuste cada vez que cambien los pagos seleccionados para evitar errores
    useEffect(() => {
        setAjusteManual(0);
    }, [selectedPagoIds]);

    const totalSaldoPendiente = useMemo(() => {
        if (selectedPagoIds.length === 0) return 0;

        const suma = selectedPagoIds.reduce((acc, id) => {
            const pago = pendingPayments.find(p => p.id === id);
            if (!pago) return acc;
            const totalPagoOriginal = Number(pago.monto) + Number(pago.propina);
            const yaFacturado = pago.facturasVinculadas?.reduce((sum, v) => sum + Number(v.monto), 0) || 0;

            // Sumamos SOLO lo que queda vivo de cada pago
            return acc + (totalPagoOriginal - yaFacturado);
        }, 0);

        return Number(suma.toFixed(2));
    }, [selectedPagoIds, pendingPayments]);

    // 🟢 2. Luego inyectamos ese saldo limpio en las estadísticas de la tarjeta negra
    // 🟢 2. Luego inyectamos ese saldo limpio en las estadísticas de la tarjeta negra
    const stats = useMemo(() => {
        // 🛡️ CLÁUSULA DE GUARDA: Si no hay pagos, retornamos ceros
        if (selectedPagoIds.length === 0 || pendingPayments.length === 0) {
            return { subtotal: 0, iva: 0, ish: 0, total: 0, count: 0, areaPago: false };
        }

        const selected = pendingPayments.filter(p => selectedPagoIds.includes(p.id)) as PagoFactura[];
        if (selected.length === 0) return { subtotal: 0, iva: 0, ish: 0, total: 0, count: 0, areaPago: false };

        // Mantenemos tu detección de área de Hotel para el 3% de ISH
        const areaPagoSelected = selected[0].movimiento.area === 'HOTEL' || selected[0].movimiento.area === 'ANTICIPO_HOTEL';

        // 🚀 PASO 1: Mantenemos tu lógica de "Dinero Base"
        // Si es individual y hay 1, manda el input manual (Split). Si no, manda el total del sistema.
        let baseSeleccionada = (tipoFactura === 'INDIVIDUAL' && selectedPagoIds.length === 1)
            ? montoAFacturar
            : totalSaldoPendiente;

        // 🚀 PASO 2: Aplicamos tu ajuste de centavos
        let totalBase = Number((baseSeleccionada + ajusteManual).toFixed(2));

        let subtotal = 0, iva = 0, ish = 0;

        if (totalBase > 0) {
            if (areaPagoSelected) {
                // Lógica original de HOTEL (1.19)
                const subtotalEstimado = totalBase / 1.19;
                iva = Number((subtotalEstimado * 0.16).toFixed(2));
                ish = Number((subtotalEstimado * 0.03).toFixed(2));
                // Aplicamos tu "Truco" para evitar que sobren centavos por redondeo
                subtotal = Number((totalBase - iva - ish).toFixed(2));
            } else {
                // Lógica original de RESTAURANTE / OTROS (1.16)
                const subtotalEstimado = totalBase / 1.16;
                iva = Number((subtotalEstimado * 0.16).toFixed(2));
                subtotal = Number((totalBase - iva).toFixed(2));
                ish = 0;
            }
        }

        return {
            subtotal,
            iva,
            ish,
            total: totalBase,
            count: selected.length,
            areaPago: areaPagoSelected,
        };
    }, [pendingPayments, selectedPagoIds, totalSaldoPendiente, montoAFacturar, tipoFactura, ajusteManual]);

    const [inputTemporal, setInputTemporal] = useState(stats.total.toString());
    const [totalAjustado, setTotalAjustado] = useState(stats.total);

    useEffect(() => {
        setTotalAjustado(stats.total);
        setInputTemporal(stats.total.toString());
    }, [stats.total]);



    const validarAjuste = () => {
        // Usamos parseFloat para mantener los decimales exactos
        const valorNumerico = Number(parseFloat(inputTemporal).toFixed(2));

        if (isNaN(valorNumerico)) {
            toast.error("Ingresa un monto válido");
            setInputTemporal(stats.total.toString());
            return;
        }

        const diferenciaDelOriginal = Number((valorNumerico - totalSaldoPendiente).toFixed(2));

        if (Math.abs(diferenciaDelOriginal) <= 1.00) {
            setAjusteManual(diferenciaDelOriginal);
            toast.success("Cálculo fiscal ajustado exactamente");
        } else {
            toast.error("El ajuste no puede ser mayor a $1.00");
            setInputTemporal(stats.total.toString());
        }
    };

    const onSave = async () => {
        if (!folioFiscal) return toast.error("El Folio Fiscal es obligatorio");
        if (selectedPagoIds.length === 0) return toast.error("Selecciona al menos un pago");

        // 🟢 1. Bloqueamos el botón inmediatamente
        setLoading(true);

        try {
            let cantidadPorFacturar = totalAjustado;

            const detallesEnvio = selectedPagoIds.map(id => {
                const pago = pendingPayments.find(p => p.id === id);
                const totalPagoOriginal = Number(pago?.monto || 0) + Number(pago?.propina || 0);
                const yaFacturado = pago?.facturasVinculadas?.reduce((acc, v) => acc + Number(v.monto), 0) || 0;
                const disponible = totalPagoOriginal - yaFacturado;

                const montoAExtraer = Math.min(disponible, cantidadPorFacturar);
                cantidadPorFacturar -= montoAExtraer;

                return {
                    pagoId: id,
                    montoAFacturar: Number(montoAExtraer.toFixed(2))
                };
            }).filter(d => d.montoAFacturar > 0);

            // 🟢 Usamos statsCorregidos para enviar los montos que el usuario ajustó
            const statsCorregidos = {
                ...stats,
                total: totalAjustado,
            };

            const res = await createFactura({
                folio: folioFiscal,
                tipo: tipoFacturaCre,
                area: areaFiltro === 'HOTEL' ? AreaType.HOTEL : AreaType.RESTAURANTE,
                ...statsCorregidos,
                detalles: detallesEnvio
            });

            if (res.ok) {
                toast.success(res.message);
                setFolioFiscal("");
                resetPagoStore();
                await handleSearch(); // 🟢 Refrescamos la lista para quitar lo facturado
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de comunicación con el servidor");
        } finally {
            // 🟢 2. Liberamos el botón, haya salido bien o mal
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 p-2 md:p-0">
            {/* PANEL FILTROS */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl flex flex-col md:grid md:grid-cols-3 gap-6 md:items-end">
                <div className="md:col-span-4 flex flex-col sm:flex-row justify-between items-center pb-6 gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 italic">Módulo de Asignación</span>
                        <h1 className="text-xl md:text-2xl font-black text-zinc-900 italic uppercase leading-none">Asignación Fiscal</h1>
                    </div>
                    <div className="flex bg-zinc-100 p-1 rounded-2xl shadow-inner w-full sm:w-auto">
                        <button
                            onClick={() => setTipoFactura('TODAS')}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${tipoFactura === 'TODAS' ? 'bg-white text-zinc-900 shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setTipoFactura('GLOBAL')}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${tipoFactura === 'GLOBAL' ? 'bg-white text-zinc-900 shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Global
                        </button>
                        <button
                            onClick={() => setTipoFactura('INDIVIDUAL')}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${tipoFactura === 'INDIVIDUAL' ? 'bg-white text-zinc-900 shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Individual
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Área</label>
                    <select value={areaFiltro} onChange={(e) => setAreaFiltro(e.target.value as any)} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500">
                        <option value="16%">Facturación 16% IVA</option>
                        <option value="HOTEL">Hotel (Hospedaje 19%)</option>
                        <option value="RESTAURANTE">Restaurante</option>
                        <option value="EVENTOS">EVENTOS</option>
                        <option value="RENTA ESPACIOS">RENTA ESPACIOS</option>
                        <option value="SOUVENIR">SOUVENIR</option>
                        <option value="TODAS">TODAS</option>
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Fecha</label>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none" />
                </div>

                <button onClick={handleSearch} disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-emerald-700 transition-all shadow-xl flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin" /> : <><Search size={18} /> Cargar Datos</>}
                </button>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
                {/* LISTADO */}
                <div className="lg:col-span-8 bg-white rounded-[3rem] border border-zinc-100 shadow-xl overflow-hidden min-h-75">
                    <div className="p-4 bg-zinc-50 border-b flex justify-between items-center text-[9px] font-black uppercase text-zinc-400 italic">
                        <span>Pagos disponibles</span>
                        <span>{pendingPayments.length} registros</span>
                    </div>

                    <div className="p-6 space-y-4 max-h-125 overflow-y-auto">
                        {pendingPayments.map(pago => {
                            const isSelected = selectedPagoIds.includes(pago.id);
                            // Calculamos lo ya facturado para mostrar información
                            const yaFacturado = pago.facturasVinculadas?.reduce((acc, v) => acc + Number(v.monto), 0) || 0;
                            const totalPago = Number(pago.monto) + Number(pago.propina);

                            return (
                                <div key={pago.id} className="space-y-3">
                                    <div onClick={() => togglePagoSelection(pago.id, isSingleSelection)} className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex justify-between items-center ${isSelected ? 'border-emerald-500 bg-emerald-50/40 shadow-md' : 'border-zinc-50 bg-zinc-50/30'}`}>
                                        <div className="flex items-center gap-5 min-w-0 flex-1">
                                            {/* Icono con estado de selección (Emerald para Facturación) */}
                                            <div className={`p-4 rounded-xl shrink-0 transition-colors ${isSelected ? 'bg-emerald-500 text-white' : 'bg-white text-zinc-300'
                                                }`}>
                                                {pago.metodo === 'transferencia' ? <Landmark size={20} /> : <CreditCard size={20} />}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-mono text-lg font-black tracking-tighter ${isSelected ? 'text-emerald-900' : 'text-zinc-900'
                                                        }`}>
                                                        #{pago.movimiento.referencia.replace(/^R-/i, '')}
                                                    </p>

                                                    {/* Badge de Área */}
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${isSelected ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                                                        }`}>
                                                        {pago.movimiento.area}
                                                    </span>
                                                </div>

                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                    {/* Nombre del Cliente del Movimiento */}
                                                    <p className={`text-[11px] font-extrabold uppercase truncate ${isSelected ? 'text-emerald-800' : 'text-zinc-700'
                                                        }`}>
                                                        {pago.movimiento.nombreCliente || 'Sin Cliente'}
                                                    </p>

                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                        {/* Razón Social y Cajero */}
                                                        <p className={`text-[10px] font-bold uppercase italic ${isSelected ? 'text-emerald-600/70' : 'text-zinc-400'
                                                            }`}>
                                                            Razón: {pago.nombreFactura || "Público"}
                                                        </p>

                                                        {yaFacturado > 0 && (
                                                            <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase border border-amber-100">
                                                                <Info size={10} /> Saldo Parcial
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-zinc-900">{formatCurrency(totalPago)}</p>
                                            {yaFacturado > 0 && <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Faltan {formatCurrency(totalPago - yaFacturado)}</p>}
                                        </div>
                                    </div>

                                    {tipoFactura === TipoFactura.INDIVIDUAL && isSelected && selectedPagoIds.length === 1 && pago.nombreFactura && (() => {
                                        const pago = pendingPayments.find(p => p.id === selectedPagoIds[0]);
                                        if (!pago) return null;

                                        const totalPago = Number(pago.monto) + Number(pago.propina);
                                        const yaFacturado = pago.facturasVinculadas?.reduce((acc, v) => acc + Number(v.monto), 0) || 0;
                                        const saldoDisponible = Number((totalPago - yaFacturado).toFixed(2));

                                        return (
                                            <div className="mx-6 p-6 bg-zinc-900 rounded-4xl text-white space-y-4 animate-in zoom-in-95 duration-300">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-emerald-500 rounded-lg"><DollarSign size={16} /></div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Monto a facturar ahora</label>
                                                    </div>
                                                    <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg uppercase">
                                                        Máximo: {formatCurrency(saldoDisponible)}
                                                    </span>
                                                </div>

                                                <input
                                                    type="number"
                                                    // 🟢 Usamos el valor neto, sin restas en el atributo 'value'
                                                    value={montoAFacturar}
                                                    onWheel={stopWheel}
                                                    onChange={(e) => {
                                                        const valorIngresado = Number(e.target.value);

                                                        // 🟢 Validación de tope máximo
                                                        if (valorIngresado > saldoDisponible) {
                                                            toast.error(`El saldo disponible es de ${formatCurrency(saldoDisponible)}`);
                                                            setMontoAFacturar(saldoDisponible);
                                                        } else if (valorIngresado < 0) {
                                                            setMontoAFacturar(0);
                                                        } else {
                                                            setMontoAFacturar(valorIngresado);
                                                        }
                                                    }}
                                                    className="w-full bg-transparent text-4xl font-black outline-none border-b-2 border-zinc-800 focus:border-emerald-500 transition-all pb-2"
                                                    placeholder="0.00"
                                                    max={saldoDisponible} // Atributo HTML de apoyo
                                                // min={0}
                                                />

                                                <p className="text-[9px] font-bold text-zinc-600 uppercase italic leading-none">
                                                    {montoAFacturar >= saldoDisponible
                                                        ? "* Con este monto el pago quedará marcado como 100% FACTURADO."
                                                        : `* Quedará un remanente de ${formatCurrency(saldoDisponible - montoAFacturar)} por facturar.`}
                                                </p>
                                            </div>
                                        );
                                    })()}


                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RESUMEN DERECHA */}
                <div className="lg:col-span-4">
                    <div className="bg-zinc-900 p-8 rounded-[3.5rem] text-white shadow-2xl space-y-8 sticky top-8 border border-white/5 overflow-hidden">

                        {/* Brillo de fondo sutil para darle profundidad */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />

                        {/* 1. SELECTOR TIPO DE FACTURA (Modo Oscuro) */}
                        <div className="space-y-3 relative z-10">
                            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] block text-center">
                                Tipo de Factura
                            </label>
                            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                                <button
                                    onClick={() => setTipoFacturaCre(TipoFactura.GLOBAL)}
                                    className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tipoFacturaCre === TipoFactura.GLOBAL ? 'bg-white text-zinc-900 shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 scale-95 hover:scale-100'}`}
                                >
                                    Global
                                </button>
                                <button
                                    onClick={() => setTipoFacturaCre(TipoFactura.INDIVIDUAL)}
                                    className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tipoFacturaCre === TipoFactura.INDIVIDUAL ? 'bg-white text-zinc-900 shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 scale-95 hover:scale-100'}`}
                                >
                                    Individual
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em] flex items-center justify-center gap-2">
                                Folio Fiscal Asignado
                            </label>
                            <input
                                value={folioFiscal}
                                onChange={(e) => setFolioFiscal(e.target.value.toUpperCase())}
                                placeholder={
                                    areaFiltro === 'TODAS' ? "EJ: F-4050" :
                                        areaFiltro === 'HOTEL' ? (tipoFacturaCre === TipoFactura.GLOBAL ? "EJ: FGH-4050" : "EJ: HH-4050") :
                                            (tipoFacturaCre === TipoFactura.GLOBAL ? "EJ: FGR-4050" : "EJ: HR-4050")
                                }
                                className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-2xl font-black outline-none focus:border-emerald-500 focus:bg-white/10 transition-all text-center tracking-widest placeholder:text-zinc-700"
                            />
                        </div>

                        <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">
                                <span>Ajuste Fiscal (±$1.00)</span>
                                <span className="text-[10px] opacity-50">Calculado: ${stats.total.toFixed(2)}</span>
                            </div>

                            <div className="relative w-full group">

                                {/* 1. Símbolo de moneda (Flotando a la izquierda) */}
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xl">
                                    $
                                </span>

                                {/* 2. El Input Real (Lleva los fondos, bordes y paddings) */}
                                <input
                                    type="number"
                                    step="0.01"
                                    value={inputTemporal}
                                    onChange={(e) => setInputTemporal(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && validarAjuste()}
                                    onWheel={stopWheel}
                                    // 🟢 CLAVE UX: pl-10 (espacio para el $) y pr-16 (espacio para el botón)
                                    className="w-full bg-black/20 py-3 pl-10 pr-16 rounded-2xl border border-white/5 outline-none focus:border-emerald-500/50 transition-all font-mono text-xl font-black text-emerald-400 placeholder:text-emerald-900/50"
                                    placeholder="0.00"
                                />

                                {/* 3. Botón de Acción (Flotando a la derecha) */}
                                <button
                                    type="button"
                                    onClick={validarAjuste}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white p-2 rounded-xl transition-all cursor-pointer group/btn"
                                    title="Validar cantidad"
                                >
                                    {/* Cambié group-active a group-active/btn para que solo reaccione al clic del botón */}
                                    <CheckCircle2 size={20} className="group-active/btn:scale-90 transition-transform" />
                                </button>

                            </div>
                        </div>

                        {/* 3. RESUMEN MATEMÁTICO */}
                        <div className="bg-black/40 p-6 rounded-3xl border border-white/5 space-y-4 relative z-10">
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                <span>Subtotal</span>
                                <span className="font-mono text-zinc-300">${stats.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                <span>IVA (16%)</span>
                                <span className="font-mono text-zinc-300">${stats.iva.toFixed(2)}</span>
                            </div>
                            {stats.ish > 0 && (
                                <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    <span>ISH (3%)</span>
                                    <span className="font-mono text-zinc-300">${stats.ish.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-end text-3xl font-black not-italic text-emerald-400 px-1 mt-2">
                                <span className="text-[10px] text-zinc-500 mb-1 tracking-tighter uppercase">Total a Facturar</span>
                                <span className="font-mono">${totalAjustado.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* 4. BOTÓN DE ACCIÓN */}
                        {/* <button
                            onClick={onSave}
                            disabled={stats.count === 0 || !folioFiscal || montoAFacturar <= 0}
                            className="w-full py-6 bg-emerald-500 text-white rounded-4xl font-black uppercase text-xs hover:bg-emerald-400 transition-all shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2 group relative z-10 cursor-pointer"
                        >
                            <span>Vincular {stats.count === 1 ? '1 Pago' : `(${stats.count}) Pagos`}</span>
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button> */}

                        <button
                            onClick={onSave}
                            disabled={loading || stats.total <= 0 || !folioFiscal || selectedPagoIds.length === 0}
                            className="w-full py-6 bg-emerald-500 text-white rounded-4xl font-black uppercase text-xs hover:bg-emerald-400 transition-all shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2 group relative z-10 cursor-pointer"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : `Vincular ${stats.count} Pago(s)`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};