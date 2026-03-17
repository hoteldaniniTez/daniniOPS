"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
    Calendar, UserCheck, AlertCircle, DollarSign, Receipt, User, Hash, Clock, Search
} from 'lucide-react';
import { KPICard } from '../reception/movement-ui';
import clsx from 'clsx';

interface Props {
    movements: any[];
    currentMesero: string;
    currentInicio: string;
    currentFin: string;
    granTotal: number;
}

export const PropinasClientView = ({
    movements,
    currentMesero,
    currentInicio,
    currentFin,
    granTotal
}: Props) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // 🟢 "Hoy" en México para restablecimientos
    const hoyMexico = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

    // 🟢 ESTADOS LOCALES PARA LAS FECHAS (El usuario edita esto, no afecta la URL hasta que da clic en Buscar)
    const [localInicio, setLocalInicio] = useState(currentInicio);
    const [localFin, setLocalFin] = useState(currentFin);

    // Sincronizamos el estado local si la URL cambia (ej. al darle "Atrás" en el navegador)
    useEffect(() => {
        setLocalInicio(currentInicio);
        setLocalFin(currentFin);
    }, [currentInicio, currentFin]);

    // Función unificada para actualizar la URL (Dispara la consulta en BD)
    const pushFiltersToUrl = (updates: Record<string, string>) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', '1'); // Siempre reset a la pag 1 al filtrar

        Object.entries(updates).forEach(([key, value]) => {
            if (value && value !== 'todos') params.set(key, value);
            else params.delete(key);
        });

        router.push(`${pathname}?${params.toString()}`);
    };

    // Handler para cuando el usuario hace clic en "Consultar Fechas"
    const handleConsultar = () => {
        let finalInicio = localInicio;
        let finalFin = localFin;

        // Auto-corrección si ponen la fecha de fin antes de la de inicio
        if (localInicio && localFin && localInicio > localFin) {
            finalFin = localInicio;
            setLocalFin(localInicio);
        }

        pushFiltersToUrl({ inicio: finalInicio, fin: finalFin, mesero: currentMesero });
    };

    const handleRestablecerHoy = () => {
        setLocalInicio(hoyMexico);
        setLocalFin(hoyMexico);
        pushFiltersToUrl({ inicio: hoyMexico, fin: hoyMexico, mesero: currentMesero });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
    };

    const meseros = ['todos', 'Victor', 'Gregorio', 'Geovanny'];

    return (
        <div className="space-y-6 max-h-screen flex flex-col">
            {/* 1. KPIs FIJOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <KPICard
                    title="Total Bruto Periodo"
                    subtitle="Acumulado del rango"
                    amount={granTotal}
                    icon={<DollarSign size={22} />}
                    color="bg-emerald-600"
                />
                <KPICard
                    title="Propina Neta (84%)"
                    subtitle="Monto para personal"
                    amount={granTotal * 0.84}
                    icon={<Receipt size={22} />}
                    color="bg-sky-600"
                />
                <KPICard
                    title="Filtro de Mesero"
                    subtitle="Personal en vista"
                    amount={currentMesero === 'todos' ? 'Vista General' : currentMesero}
                    icon={<User size={22} />}
                    color="bg-violet-600"
                />
            </div>

            {/* 2. BARRA DE FILTROS REDISEÑADA */}
            <div className="relative shrink-0">
                <div className="bg-white p-3 md:p-4 rounded-4xl border border-zinc-100 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">

                    {/* Filtro de Meseros (Este SÍ actualiza inmediato para UX rápida) */}
                    <div className="flex bg-zinc-100 p-1.5 rounded-2xl w-full xl:w-auto overflow-x-auto no-scrollbar">
                        {meseros.map((m) => (
                            <button
                                key={m}
                                onClick={() => pushFiltersToUrl({ mesero: m, inicio: currentInicio, fin: currentFin })}
                                className={clsx(
                                    "flex-1 xl:flex-none px-6 py-2 rounded-xl text-[11px] font-bold uppercase transition-all whitespace-nowrap",
                                    currentMesero === m ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                                )}
                            >
                                {m}
                            </button>
                        ))}
                    </div>

                    {/* 🟢 SECCIÓN DE FECHAS Y BOTÓN DE CONSULTA */}
                    <div className="flex flex-col sm:flex-row items-end gap-3 w-full xl:w-auto">

                        {/* Inputs de Fecha Locales */}
                        <div className="grid grid-cols-2 sm:flex gap-3 w-full sm:w-auto">
                            <div className="flex flex-col w-full sm:w-36">
                                <label className="text-[9px] font-black uppercase text-zinc-400 ml-2 mb-1">Desde</label>
                                <input
                                    type="date"
                                    value={localInicio}
                                    onChange={(e) => setLocalInicio(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-zinc-50 rounded-2xl text-xs font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500/20 border border-transparent transition-all cursor-pointer h-9.5"
                                />
                            </div>
                            <div className="flex flex-col w-full sm:w-36">
                                <label className="text-[9px] font-black uppercase text-zinc-400 ml-2 mb-1">Hasta</label>
                                <input
                                    type="date"
                                    value={localFin}
                                    min={localInicio}
                                    onChange={(e) => setLocalFin(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-zinc-50 rounded-2xl text-xs font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500/20 border border-transparent transition-all cursor-pointer h-9.5"
                                />
                            </div>
                        </div>

                        {/* Botón Principal de Búsqueda */}
                        <button
                            onClick={handleConsultar}
                            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 bg-zinc-900 hover:bg-black text-white rounded-2xl transition-all shadow-md active:scale-95 text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer h-9.5"
                            title="Consultar este rango de fechas"
                        >
                            <Search size={14} className="text-emerald-400" />
                            <span>Consultar Fechas</span>
                        </button>

                        {/* Botón para restablecer a HOY (Visible solo si la URL no es HOY) */}
                        {(currentInicio !== hoyMexico || currentFin !== hoyMexico) && (
                            <button
                                onClick={handleRestablecerHoy}
                                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-2xl transition-all shadow-sm active:scale-95 text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer h-9.5"
                                title="Restablecer a la fecha de hoy"
                            >
                                <Calendar size={14} className="text-zinc-500" />
                                <span>Hoy</span>
                            </button>
                        )}
                    </div>

                </div>
            </div>

            {/* 3. LISTADO CON SCROLL INTERNO */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl overflow-hidden flex flex-col min-h-0 flex-1">
                <div className="overflow-y-auto custom-scrollbar flex-1 max-h-125 md:max-h-none">

                    {/* 📱 VISTA MÓVIL (CARDS) */}
                    <div className="md:hidden divide-y divide-zinc-50">
                        {movements.map(m => (
                            <div key={m.id} className="p-5 flex flex-col gap-4 active:bg-zinc-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Hash size={14} className="text-amber-500" />
                                            <p className="font-mono font-black text-zinc-900 text-base">
                                                {m.referencia.replace(/^R-/i, '')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-zinc-400">
                                            <Clock size={12} />
                                            <span className="text-[10px] font-bold uppercase">
                                                {new Date(m.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-amber-600 leading-none">{formatCurrency(m.propina)}</p>
                                        <span className="text-[9px] font-black text-zinc-400 uppercase">Propina</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-zinc-50">
                                    <span className="text-[10px] font-black text-zinc-600 uppercase italic flex items-center gap-2">
                                        <UserCheck size={12} className="text-amber-500" /> {m.detalleRestaurante?.mesero || "N/A"}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 💻 VISTA PC (TABLA) */}
                    <div className="hidden md:block">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                <tr className="bg-zinc-50/50 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                                    <th className="p-6">Comanda</th>
                                    <th className="p-6">Mesero</th>
                                    <th className="p-6">Fecha / Hora</th>
                                    <th className="p-6 text-right">Monto Propina</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {movements.map(m => (
                                    <tr key={m.id} className="hover:bg-zinc-50/30 transition-colors group">
                                        <td className="p-6">
                                            <p className="font-mono font-black text-zinc-900 text-sm tracking-tighter">#{m.referencia.replace(/^R-/i, '')}</p>
                                            <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black uppercase italic">Danini</span>
                                        </td>
                                        <td className="p-6"><div className="flex items-center gap-2 text-zinc-600 text-sm font-bold uppercase italic"><div className="p-1.5 bg-amber-50 rounded-lg"><UserCheck size={14} className="text-amber-500" /></div>{m.detalleRestaurante?.mesero || "Sin asignar"}</div></td>
                                        <td className="p-6">
                                            <p className="text-[11px] font-black text-zinc-900">
                                                {new Date(m.createdAt).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' })}
                                            </p>
                                            <p className="text-[10px] text-zinc-400">
                                                {new Date(m.createdAt).toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                        <td className="p-6 text-right"><p className="font-black text-amber-600 text-lg tracking-tighter">{formatCurrency(m.propina)}</p></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {movements.length === 0 && (
                        <div className="py-24 text-center">
                            <AlertCircle className="mx-auto text-zinc-200" size={40} />
                            <p className="text-zinc-900 font-black uppercase text-sm italic mt-4">Sin registros de propina en este periodo</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};