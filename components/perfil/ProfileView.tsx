"use client";

import { Mail, Shield } from "lucide-react";

interface Props {
    user: {
        name?: string | null;
        email?: string | null;
        role?: string | null;
    };
}

export const ProfileView = ({ user }: Props) => {

    const formatRole = (role: string) => {
        return role === "admin" ? 'Administrador' : role === "auxiliar_admin" ? "Auxiliar administrativo" : "Recepcionista";
    };

    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Card Principal de Perfil */}
            <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-xl overflow-hidden">
                <div className="h-32 bg-zinc-900 w-full" /> {/* Banner decorativo */}

                <div className="px-8 pb-8">
                    <div className="relative flex justify-between items-end -mt-12 mb-6">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-white p-2 shadow-2xl">
                            <div className="w-full h-full rounded-4xl bg-zinc-100 flex items-center justify-center text-zinc-900 text-4xl font-black border-4 border-zinc-50">
                                {user.name?.[0].toUpperCase()}
                            </div>
                        </div>

                        {/* <button className="px-6 py-3 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg">
                            Editar Foto
                        </button> */}
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{user.name}</h2>
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Shield size={14} className="text-amber-500" />
                            <span className="text-xs font-bold uppercase tracking-widest">{formatRole(user.role || 'recepcionista')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Información Detallada */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Columna de Datos */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-6">
                        <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] border-b pb-4">Información de Contacto</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <p className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                    <Mail size={12} /> Correo Electrónico
                                </p>
                                <p className="font-bold text-zinc-900 text-sm">{user.email}</p>
                            </div>

                            {/* <div className="space-y-1">
                                <p className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                    <MapPin size={12} /> Ubicación Asignada
                                </p>
                                <p className="font-bold text-zinc-900 text-sm italic">Teziutlán, Puebla</p>
                            </div> */}
                        </div>
                    </div>
                </div>

                {/* Columna de Estado / KPIs */}
                <div className="space-y-6">
                    <div className="bg-zinc-900 p-8 rounded-[2.5rem] shadow-xl shadow-zinc-200">
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Estado del Sistema</p>
                        <div className="flex items-center gap-3 text-emerald-400 mb-6">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-xs font-black uppercase italic tracking-widest">Conexión Activa</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};