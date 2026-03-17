"use client";

import { useState, useMemo, useEffect } from 'react';
import { formatCurrency } from "@/utils";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export const DailyTrendChart = ({ data }: { data: any[] }) => {
    // 1. Extraer los meses únicos disponibles en la data (Ej. ['2026-01', '2026-02'])
    const mesesDisponibles = useMemo(() => {
        const meses = new Set(data.map(d => d.fecha.substring(0, 7)));
        return Array.from(meses).sort();
    }, [data]);

    // 2. Estado para el mes seleccionado (por defecto, el último mes del rango)
    const [mesSeleccionado, setMesSeleccionado] = useState(mesesDisponibles[mesesDisponibles.length - 1] || "");

    // Asegurarnos de actualizar el estado si cambian los filtros generales
    useEffect(() => {
        if (mesesDisponibles.length > 0 && !mesesDisponibles.includes(mesSeleccionado)) {
            setMesSeleccionado(mesesDisponibles[mesesDisponibles.length - 1]);
        }
    }, [mesesDisponibles, mesSeleccionado]);

    // 3. Filtrar los datos para mostrar solo el mes seleccionado
    const datosFiltrados = useMemo(() => {
        return data
            .filter(d => d.fecha.startsWith(mesSeleccionado))
            .map(d => ({
                ...d,
                fechaCorta: new Date(d.fecha + 'T12:00:00Z').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).replace('.', ''),
                total: d.TOTAL
            }));
    }, [data, mesSeleccionado]);

    // Función para mostrar el nombre del mes en el Select (Ej. "Enero 2026")
    const formatMesSelect = (yyyyMM: string) => {
        if (!yyyyMM) return "";
        const [year, month] = yyyyMM.split('-');
        const date = new Date(Number(year), Number(month) - 1, 1);
        const nombre = date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        return nombre.charAt(0).toUpperCase() + nombre.slice(1);
    };

    return (
        <div className="bg-white p-6 rounded-4xl border border-zinc-200 shadow-xl flex flex-col h-100">
            {/* Header con Selector */}
            <div className="flex justify-between items-start mb-6">
                <h3 className="font-black text-zinc-800 uppercase tracking-widest text-sm flex items-center gap-2">
                    📈 Tendencia Diaria
                </h3>

                {/* Solo mostramos el select si hay más de 1 mes */}
                {mesesDisponibles.length > 1 && (
                    <select
                        value={mesSeleccionado}
                        onChange={(e) => setMesSeleccionado(e.target.value)}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                        {mesesDisponibles.map(mes => (
                            <option key={mes} value={mes}>{formatMesSelect(mes)}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={datosFiltrados} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                        <XAxis
                            dataKey="fechaCorta"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#a1a1aa', fontWeight: 600 }}
                            tickFormatter={(value) => `$${value >= 1000 ? (value / 1000) + 'k' : value}`}
                        />
                        <Tooltip
                            cursor={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5 5' }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-zinc-900 text-white p-3 rounded-xl shadow-xl border border-zinc-700">
                                            <p className="text-zinc-400 text-xs font-bold uppercase mb-1">{label}</p>
                                            <p className="text-emerald-400 font-mono text-lg font-black">
                                                {formatCurrency(payload[0].value as number)}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorTotal)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};