"use client";

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    MoreVertical, Key, Loader2, Check, X, Lock, UserMinus, UserCheck, ChevronRight, ArrowLeft, ShieldCheck
} from 'lucide-react';
import { updateUserAdmin } from "@/actions";
import { toast } from "sonner";

interface Props {
    user: {
        id: string;
        name: string;
        role: string;
        active: boolean
    };
}

export const UserActions = ({ user }: Props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'main' | 'roles'>('main'); // Control de sub-menú
    const [showPassModal, setShowPassModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 });
    const [isReady, setIsReady] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const updateCoords = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuCoords({
                top: rect.top + window.scrollY + rect.height,
                left: rect.left + window.scrollX - 180
            });
        }
    };

    useLayoutEffect(() => {
        if (isOpen) {
            updateCoords();
            setIsReady(true);
            window.addEventListener('scroll', updateCoords);
            window.addEventListener('resize', updateCoords);
        } else {
            setIsReady(false);
            setView('main'); // Resetear al cerrar
        }
        return () => {
            window.removeEventListener('scroll', updateCoords);
            window.removeEventListener('resize', updateCoords);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAction = async (data: { role?: string, password?: string, active?: boolean }) => {
        setIsLoading(true);
        const resp = await updateUserAdmin(user.id, data);

        if (resp.ok) {
            toast.success("Acción realizada con éxito");
            setIsOpen(false);
            setShowPassModal(false);
            setNewPassword("");
        } else {
            toast.error(resp.message || "Error al realizar la acción");
        }
        setIsLoading(false);
    };

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 cursor-pointer transition-all active:scale-95"
            >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <MoreVertical size={20} />}
            </button>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    style={{
                        position: 'absolute',
                        top: `${menuCoords.top}px`,
                        left: `${menuCoords.left}px`,
                        zIndex: 9999,
                        visibility: isReady ? 'visible' : 'hidden',
                        opacity: isReady ? 1 : 0
                    }}
                    className="w-60 bg-white rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                    {/* VISTA PRINCIPAL */}
                    {view === 'main' && (
                        <div className="animate-in slide-in-from-left-2 duration-200">
                            <div className="p-4 border-b border-zinc-50 bg-zinc-50/50 text-left">
                                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Gestionar Acceso</p>
                                <p className="text-[11px] font-bold text-zinc-900 truncate">{user.name}</p>
                            </div>
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => setView('roles')}
                                    className="w-full flex items-center justify-between px-4 py-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck size={16} />
                                        <span>Cambiar Rol</span>
                                    </div>
                                    <ChevronRight size={14} className="text-zinc-300" />
                                </button>

                                <button
                                    onClick={() => { setShowPassModal(true); setIsOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    <Key size={16} />
                                    <span>Nueva Contraseña</span>
                                </button>

                                <div className="h-px bg-zinc-50 my-1" />

                                <button
                                    onClick={() => handleAction({ active: !user.active })}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${user.active ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                                        }`}
                                >
                                    {user.active ? <UserMinus size={16} /> : <UserCheck size={16} />}
                                    <span>{user.active ? "Desactivar Usuario" : "Activar Usuario"}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* VISTA DE ROLES (SUBMENÚ) */}
                    {view === 'roles' && (
                        <div className="animate-in slide-in-from-right-2 duration-200">
                            <div className="p-2 border-b border-zinc-50 flex items-center gap-2">
                                <button
                                    onClick={() => setView('main')}
                                    className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Elegir nuevo rol</p>
                            </div>
                            <div className="p-2 space-y-1">
                                {['admin', 'recepcionista', 'auxiliar_admin'].map((role) => (
                                    <button
                                        key={role}
                                        onClick={() => handleAction({ role })}
                                        disabled={user.role === role}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${user.role === role
                                            ? 'bg-zinc-900 text-white shadow-lg'
                                            : 'text-zinc-600 hover:bg-zinc-50'
                                            }`}
                                    >
                                        <span className="capitalize">{role.replace('_', ' ')}</span>
                                        {user.role === role && <Check size={14} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>,
                document.body
            )}

            {/* MODAL DE CONTRASEÑA */}
            {showPassModal && createPortal(
                <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md" onClick={() => !isLoading && setShowPassModal(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-zinc-100">
                        <div className="flex justify-between items-center mb-6">
                            <div className="bg-zinc-100 p-3 rounded-2xl text-zinc-900 shadow-inner"><Lock size={20} /></div>
                            <button onClick={() => setShowPassModal(false)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"><X size={24} /></button>
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 mb-2 tracking-tight">Cambiar Password</h3>
                        <p className="text-xs text-zinc-500 mb-6 font-medium leading-relaxed">Establece una nueva clave para <span className="font-bold text-zinc-900">{user.name}</span>.</p>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm outline-none focus:border-zinc-900 focus:bg-white transition-all mb-6"
                        />
                        <button
                            disabled={newPassword.length < 6 || isLoading}
                            onClick={() => handleAction({ password: newPassword })}
                            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-zinc-800 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Confirmar Cambio"}
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};