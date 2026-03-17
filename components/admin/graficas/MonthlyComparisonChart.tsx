"use client";

import { formatCurrency } from "@/utils";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from "recharts";

export const MonthlyComparisonChart = ({ data }: { data: any[] }) => {
    // 1. Agrupar los datos diarios por mes
    const monthlyDataMap = new Map<string, number>();

    data.forEach(d => {
        // Extraemos "YYYY-MM"
        const monthKey = d.fecha.substring(0, 7);
        const currentTotal = monthlyDataMap.get(monthKey) || 0;
        monthlyDataMap.set(monthKey, currentTotal + d.TOTAL);
    });

    // Si solo hay un mes en los datos, no renderizamos esta gráfica (no hay nada que comparar)
    if (monthlyDataMap.size <= 1) return null;

    // 2. Formatear para Recharts
    const chartData = Array.from(monthlyDataMap.entries()).map(([monthKey, total]) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(Number(year), Number(month) - 1, 1);
        const nombreMes = date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

        return {
            mes: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
            total
        };
    });

    return (
        <div className="bg-white p-6 rounded-4xl border border-zinc-200 shadow-xl flex flex-col h-100">
            <h3 className="font-black text-zinc-800 uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                📊 Comparativa Mensual
            </h3>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                        <XAxis
                            dataKey="mes"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#71717a', fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#71717a', fontWeight: 600 }}
                            tickFormatter={(value) => `$${value >= 1000 ? (value / 1000) + 'k' : value}`}
                        />
                        <Tooltip
                            cursor={{ fill: '#f4f4f5' }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-zinc-900 text-white p-3 rounded-xl shadow-xl border border-zinc-700">
                                            <p className="text-zinc-400 text-xs font-bold uppercase mb-1">{label}</p>
                                            <p className="text-blue-400 font-mono text-lg font-black">
                                                {formatCurrency(payload[0].value as number)}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? "#3b82f6" : "#93c5fd"} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};