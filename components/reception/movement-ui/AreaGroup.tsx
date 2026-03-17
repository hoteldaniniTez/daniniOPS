import { MovimientoCompleto } from "@/interfaces";
import { MetodoPago } from "@/lib/generated/prisma/enums";
import clsx from "clsx";
import { CheckCircle2, Clock, Eye, Sparkles, X, FileText, User, XCircle, MinusCircle, Timer } from "lucide-react";

interface Props {
    area: string;
    movs: MovimientoCompleto[];
    formatCurrency: (amount: number) => string;
    onOpenDetails: (m: any) => void;
    credito?: boolean;
}

export const AreaGroup = ({ area, movs, formatCurrency, onOpenDetails, credito = false }: Props) => (
    <>
        <tr className="bg-zinc-50 border-y border-zinc-200">
            <td colSpan={5} className="py-2 px-8">
                <span className="text-[18px] font-black uppercase tracking-[0.3em] text-zinc-500 italic">
                    {area.replace('_', ' ')}
                </span>
            </td>
        </tr>
        {
            movs.map((m: any) => {
                const importeIngresoReal = m.pagos.reduce((acc: number, p: any) => {
                    if (p.metodo === MetodoPago.cupon) return acc;
                    if (p.metodo === MetodoPago.credito_cobrar && p.referencia?.includes("LIQUIDADO")) {
                        return acc;
                    }
                    if (!credito && p.metodo === MetodoPago.credito_cobrar) return acc;
                    return acc + Number(p.monto) + Number(p.propina);
                }, 0);

                const propinaTotal = m.pagos.reduce((acc: number, p: any) => acc + Number(p.propina || 0), 0);

                const metodosBancarios = [MetodoPago.transferencia, MetodoPago.tarjeta, MetodoPago.p_deposito];
                const tienePagoBancario = m.pagos.some((p: any) => metodosBancarios.includes(p.metodo));
                const requiereFacturaMov = m.pagos.some((p: any) => p.requiereFactura);

                return (
                    <tr key={m.id} className="hover:bg-blue-50 transition-colors border-b group">
                        {credito ? (
                            <>
                                <td className="p-6">
                                    <p className="font-mono font-bold text-zinc-900 text-sm">{m.referencia.replace(/^R-/i, '')}</p>
                                    <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black uppercase tracking-tighter italic">
                                        {m.area.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-6">
                                    <p className="font-semibold text-zinc-700 text-sm truncate max-w-45">
                                        {m.nombreCliente || "Cliente General"}
                                    </p>
                                    {/* 🟢 CORRECCIÓN 1: ZONA HORARIA MÉXICO PARA LA VISTA DE CRÉDITOS */}
                                    <p className="text-[10px] text-zinc-400 tracking-tight">
                                        {new Date(m.createdAt).toLocaleString('es-MX', {
                                            timeZone: 'America/Mexico_City',
                                            day: '2-digit',
                                            month: 'short',
                                            year: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </td>
                                <td className="p-6 font-black text-zinc-900 text-sm italic">
                                    {formatCurrency(Number(m.montoNeto))}
                                </td>
                                <td className="p-6">
                                    {m.pagado ? (
                                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase bg-emerald-50 px-3 py-1 rounded-full w-fit">
                                            <CheckCircle2 size={12} /> Pagado
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase bg-red-50 px-3 py-1 rounded-full w-fit">
                                            <Clock size={12} /> Pendiente
                                        </div>
                                    )}
                                </td>
                            </>
                        ) : (
                            <>
                                <td className="p-4 pl-8 align-top">
                                    <div className="flex flex-col gap-0.5">

                                        {/* Nivel 1: Datos Principales (Referencia y Cliente) */}
                                        <div>
                                            <p className="font-mono text-[13px] font-bold text-zinc-900 leading-tight">
                                                #{m.referencia.replace(/^R-/i, '')}
                                            </p>

                                            {/* Contenedor Flex para alinear el nombre y la hora en la misma fila */}
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[11.5px] font-medium text-zinc-500 truncate max-w-40" title={m.nombreCliente || 'General'}>
                                                    {m.nombreCliente || 'General'}
                                                </span>

                                                {!m.creador && (
                                                    <span className="text-[11px] font-medium text-zinc-400 shrink-0 whitespace-nowrap tracking-wide">
                                                        {/* 🟢 CORRECCIÓN 2: ZONA HORARIA MÉXICO PARA LA VISTA GENERAL */}
                                                        • {new Date(m.createdAt).toLocaleString('es-MX', {
                                                            timeZone: 'America/Mexico_City',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>


                                        {/* Nivel 2: Metadatos (Creador + Fecha) */}
                                        {m.creador && (
                                            <div className="flex items-center text-[10.5px] text-zinc-400 mt-1.5">
                                                <User size={11} className="shrink-0 mr-1.5" />

                                                <div className="flex items-center truncate">
                                                    {/* Nombre del creador resaltado sutilmente */}
                                                    {m.creador && (
                                                        <span className="font-semibold text-zinc-500 truncate max-w-22.5" title={m.creador}>
                                                            {m.creador}
                                                        </span>
                                                    )}

                                                    {/* Separador visual si existen ambos datos */}
                                                    {m.creador && m.createdAt && (
                                                        <span className="mx-1.5 text-zinc-300">•</span>
                                                    )}

                                                    {/* Fecha y hora limpias */}
                                                    {m.createdAt && (
                                                        <span className="whitespace-nowrap tracking-wide">
                                                            {/* 🟢 CORRECCIÓN 3: ZONA HORARIA MÉXICO SI HAY CREADOR */}
                                                            {new Date(m.createdAt).toLocaleString('es-MX', {
                                                                timeZone: 'America/Mexico_City',
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: '2-digit',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </td>
                                {/* NUEVA COLUMNA DE FACTURA DINÁMICA */}
                                <td className="p-4 text-center">
                                    {m.folioFactura ? (
                                        <div className="flex flex-col items-center gap-0.5" title="Factura Emitida">
                                            <CheckCircle2 size={18} className="text-emerald-500 mx-auto" />
                                            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                {m.folioFactura}
                                            </span>
                                        </div>
                                    ) : requiereFacturaMov ? (
                                        <div className="flex flex-col items-center gap-0.5 opacity-80" title="Pendiente de Emitir">
                                            <Clock size={18} className="text-amber-500 mx-auto" />
                                            <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">
                                                Requiere Factura
                                            </span>
                                        </div>
                                    ) : tienePagoBancario ? (
                                        <div className="flex flex-col items-center gap-0.5 opacity-70" title="Ingreso Bancario sin Facturar">
                                            <XCircle size={18} className="text-red-400 mx-auto" />
                                            <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">
                                                Requiere Factura Global
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-0.5 opacity-40" title="Público en General">
                                            <MinusCircle size={18} className="text-zinc-400 mx-auto" />
                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">
                                                No Facturable
                                            </span>
                                        </div>
                                    )}
                                </td>

                                <td className="p-4">
                                    <div className="flex flex-wrap gap-1">
                                        {m.detalleHotel && (
                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-black uppercase">
                                                HAB: {m.detalleHotel.habitaciones}
                                            </span>
                                        )}
                                        {m.detalleRestaurante && (
                                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[11px] font-black uppercase">
                                                MESA: {m.detalleRestaurante.mesa}
                                            </span>
                                        )}
                                    </div>
                                </td>

                                <td className="p-4 align-top">
                                    <div className="flex flex-col gap-1.5">
                                        {m.pagos.map((p: any, i: number) => {
                                            const isCreditoCobrar = p.metodo === 'credito_cobrar';
                                            const tieneOtrosPagos = m.pagos.some((otroPago: any) => otroPago.metodo !== 'credito_cobrar');
                                            const creditoLiquidado = isCreditoCobrar && tieneOtrosPagos;

                                            const montoAMostrar = creditoLiquidado ? 0 : (Number(p.monto) + Number(p.propina));

                                            return (
                                                <div key={i} className={`flex items-center gap-2 transition-all ${creditoLiquidado ? 'opacity-50' : ''}`}>
                                                    <div className={clsx(
                                                        "inline-flex px-1.5 py-0.5 rounded items-center gap-1 shadow-sm",
                                                        {
                                                            'bg-emerald-600 text-white': p.metodo === 'efectivo',
                                                            'bg-cyan-600 text-white': p.metodo === 'p_deposito',
                                                            'bg-blue-600 text-white': p.metodo === 'tarjeta',
                                                            'bg-purple-600 text-white': p.metodo === 'transferencia',
                                                            'bg-rose-600 text-white': p.metodo === 'credito_familiar',
                                                            'bg-yellow-400 text-white': p.metodo === 'cortesia_h',
                                                            'bg-teal-400 text-white': p.metodo === 'cortesia_r',
                                                            'bg-orange-600 text-white': p.metodo === 'cupon',
                                                            'bg-lime-500 text-white': p.metodo === "credito_cobrar"
                                                        }
                                                    )}>
                                                        <span className="text-[10px] font-black uppercase tracking-tighter">
                                                            {p.metodo.replace('_', ' ')}
                                                        </span>
                                                        {p.numTerminal && (
                                                            <span className="text-[9px] font-bold opacity-80 border-l border-white/30 pl-1">
                                                                T-{p.numTerminal.split('_')[1]}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {p.requiereFactura && (
                                                        <FileText size={10} className="text-emerald-500 shrink-0" />
                                                    )}

                                                    <span className={`text-sm font-bold tracking-tight ${p.metodo === 'cupon' ? 'text-orange-600' : creditoLiquidado ? 'text-zinc-500 line-through' : 'text-zinc-800'}`}>
                                                        {formatCurrency(montoAMostrar)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </td>
                            </>
                        )}

                        <td className="p-4 pr-8 text-right font-black italic">
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center justify-end gap-3">
                                    <div className="flex items-center gap-2">
                                        {propinaTotal > 0 && (
                                            <span className="flex items-center gap-0.5 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[11px] font-black animate-pulse">
                                                <Sparkles size={8} /> {formatCurrency(propinaTotal)}
                                            </span>
                                        )}
                                        <p className={`text-[15px] ${importeIngresoReal === 0 ? 'text-zinc-300' : 'text-zinc-900'}`}>
                                            {formatCurrency(importeIngresoReal)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onOpenDetails(m)}
                                        className="p-2 hover:bg-zinc-900 hover:text-white rounded-xl transition-all text-zinc-300 group-hover:text-zinc-900 shadow-sm cursor-pointer"
                                    >
                                        <Eye size={20} />
                                    </button>
                                </div>

                                {m.pagos.some((p: any) => p.metodo === MetodoPago.cupon) && (
                                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-tighter leading-none p-1">
                                        {importeIngresoReal > 0 ? 'Saldado Parcial ' : 'Liquidado '} con Cupón
                                    </p>
                                )}
                            </div>
                        </td>
                    </tr >
                );
            })
        }
    </>
);