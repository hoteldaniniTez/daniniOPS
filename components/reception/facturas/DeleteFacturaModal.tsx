"use client";

import { useState } from 'react';
import { X, ShieldAlert, Loader2 } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (motivo: string) => void;
    isLoading: boolean;
    count?: number;
    isFactura?: boolean;
}

export const DeleteFacturaModal = ({ isOpen, onClose, onConfirm, isLoading, count = 0, isFactura = true }: Props) => {
    const [motivo, setMotivo] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                            <ShieldAlert size={28} />
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
                            <X size={20} className="text-zinc-400" />
                        </button>
                    </div>

                    <div className="space-y-2">

                        {isFactura

                            ?
                            <>
                                <h2 className="text-2xl font-black text-zinc-900 italic uppercase">¿Revertir Factura(s)?</h2>
                                <p className="text-sm text-zinc-500 font-medium">
                                    Estás por desvincular <span className="text-rose-600 font-bold">{count} registro(s)</span>.
                                    Esta acción es delicada y quedará registrada en el sistema.
                                </p>
                            </>
                            : <>
                                <h2 className="text-2xl font-black text-zinc-900 italic uppercase">¿Revertir Crédito Por Cobrar?</h2>
                                <p className="text-sm text-zinc-500 font-medium">
                                    Estás por desvincular <span className="text-rose-600 font-bold">los pagos de este crédito por cobrar</span>.
                                    Esta acción es delicada y quedará registrada en el sistema.
                                </p>
                            </>
                        }
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                            Motivo de la eliminación (Auditoría)
                        </label>
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder={isFactura ? "Ej: Error en datos fiscales del cliente / Refacturación..." : "El cliente cambió de método de pago"}
                            className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-3xl text-sm font-bold outline-none focus:border-rose-500 focus:bg-white transition-all resize-none h-28"
                        />
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            onClick={() => onConfirm(motivo)}
                            disabled={isLoading || motivo.length < 5}
                            className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-rose-600/20 hover:bg-rose-700 disabled:opacity-30 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : "Confirmar Desvinculación"}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 text-zinc-400 font-black uppercase text-[10px] hover:text-zinc-600 transition-colors"
                        >
                            Cancelar Acción
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};