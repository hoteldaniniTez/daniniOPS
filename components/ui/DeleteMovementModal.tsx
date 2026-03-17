"use client";

import { X, ShieldAlert, Loader2 } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void; // 🟢 Ya no recibe el motivo, solo ejecuta la acción
    isLoading: boolean;
}

export const DeleteMovementModal = ({ isOpen, onClose, onConfirm, isLoading }: Props) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-zinc-200">
                <div className="p-8 space-y-6">
                    {/* ICONO Y BOTÓN DE CERRAR */}
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                            <ShieldAlert size={28} />
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
                            <X size={20} className="text-zinc-400" />
                        </button>
                    </div>

                    {/* TÍTULO Y ADVERTENCIA */}
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-zinc-900 italic uppercase leading-none">
                            ¿Eliminar Movimiento?
                        </h2>
                        <p className="text-sm text-zinc-500 font-medium">
                            Estás a punto de borrar este registro y todos sus pagos permanentemente.
                            <span className="text-red-600 font-bold ml-1 block mt-1">El motivo de auditoría quedará registrado.</span>
                        </p>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex flex-col gap-3 pt-4 border-t border-zinc-100">
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-red-500/20 hover:bg-red-600 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : "Sí, Eliminar Definitivamente"}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="w-full py-4 text-zinc-400 font-black uppercase text-[10px] hover:text-zinc-600 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};