"use client";

import { formatCurrency } from "@/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export const PaymentMethodDonutChart = ({ totales }: { totales: any }) => {
    const rawData = [
        { name: 'Efectivo', value: totales.efectivo, color: '#10b981' },           // emerald-500
        { name: 'P/Depósito', value: totales.p_deposito, color: '#06b6d4' },       // cyan-500
        { name: 'Transferencia', value: totales.transferencia, color: '#8b5cf6' }, // violet-500
        { name: 'T-4303851', value: totales.T_4303851, color: '#3b82f6' },         // blue-500 (Tono principal)
        { name: 'T-4449999', value: totales.T_4449999, color: '#93c5fd' },         // blue-300 (Tono más claro)
        { name: 'Crédito Fam.', value: totales.credito_familiar, color: '#f43f5e' }, // rose-500
        { name: 'Cortesía H.', value: totales.cortesia_h, color: '#facc15' },      // yellow-400
        { name: 'Cortesía R.', value: totales.cortesia_r, color: '#2dd4bf' }       // teal-400
    ];

    // 2. Filtramos los que están en 0 para no ensuciar la dona
    const chartData = rawData.filter(item => item.value > 0);

    // Si no hay ingresos, no mostramos nada
    if (chartData.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-4xl border border-zinc-200 shadow-xl flex flex-col h-100">
            <h3 className="font-black text-zinc-800 uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
                🍩 Composición de Ingresos
            </h3>
            <p className="text-xs font-bold text-zinc-400 mb-4">Distribución por método de cobro</p>

            <div className="flex-1 w-full relative">

                {/* 🟢 1. El texto central ahora va PRIMERO y le agregamos z-0 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8 z-0">
                    <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Total</span>
                    <span className="text-zinc-900 font-mono font-black text-lg">
                        {formatCurrency(chartData.reduce((acc, curr) => acc + curr.value, 0))}
                    </span>
                </div>

                {/* 🟢 2. Envolvemos la gráfica y le damos z-10 para que flote por encima del texto */}
                <div className="w-full h-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                                labelLine={{ stroke: '#a1a1aa', strokeWidth: 1 }}
                                label={({ cx, cy, midAngle, outerRadius, percent, index }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = outerRadius * 1.15;
                                    const x = cx + radius * Math.cos(-midAngle! * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle! * RADIAN);

                                    if (percent! < 0.0001) return null;

                                    return (
                                        <text
                                            x={x}
                                            y={y}
                                            fill={chartData[index].color}
                                            textAnchor={x > cx ? 'start' : 'end'}
                                            dominantBaseline="central"
                                            className="text-[11px] font-black font-mono"
                                        >
                                            {`${(percent! * 100).toFixed(2)}%`}
                                        </text>
                                    );
                                }}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>

                            <Tooltip
                                // 🟢 3. Forzamos la máxima prioridad visual para el cuadrito negro
                                wrapperStyle={{ zIndex: 100 }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            // Agregué shadow-2xl para darle más profundidad
                                            <div className="bg-zinc-900 text-white p-3 rounded-xl shadow-2xl border border-zinc-700">
                                                <p className="text-zinc-400 text-xs font-bold uppercase mb-1">{data.name}</p>
                                                <p className="font-mono text-lg font-black" style={{ color: data.color }}>
                                                    {formatCurrency(data.value)}
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />

                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(value) => (
                                    <span className="text-xs font-bold text-zinc-600 ml-1">{value}</span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};