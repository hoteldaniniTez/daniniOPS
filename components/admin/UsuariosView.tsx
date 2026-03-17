"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from "react-hook-form";
import {
    UserPlus, Mail, Shield, User, X, Check, Key, Search, Loader2, AlertCircle, CheckCircle2, SquareCheck, OctagonX, Calendar,
    EyeOff,
    Eye,
    ChevronDown,
    UserCog
} from 'lucide-react';
import { registerUser } from "@/actions";
import { UserActions } from './UserActions';

interface Props {
    users: any[];
}

type FormInputs = {
    name: string;
    email: string;
    password: string;
    role: "admin" | "recepcionista" | "auxiliar_admin";
}

export const UsuariosView = ({ users }: Props) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Estados para el feedback del servidor
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            role: "recepcionista"
        }
    });

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        setErrorMessage('');
        setSuccessMessage('');
        setIsSubmitting(true);

        const resp = await registerUser(data);

        if (!resp.ok) {
            setErrorMessage(resp.message || "No se pudo crear el usuario");
            setIsSubmitting(false);
            return;
        }

        // Feedback de éxito
        setSuccessMessage(resp.message || "Usuario creado");
        setIsSubmitting(false);

        // Esperamos un poco para que el usuario vea el mensaje de éxito antes de cerrar
        setTimeout(() => {
            reset();
            setIsModalOpen(false);
            setSuccessMessage('');
        }, 1500);
    }

    return (
        <div className="space-y-6">
            {/* 1. Barra de herramientas */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-100 rounded-2xl text-sm outline-none focus:border-zinc-900 transition-all shadow-sm"
                    />
                </div>

                <button
                    onClick={() => {
                        setErrorMessage('');
                        setSuccessMessage('');
                        reset();
                        setIsModalOpen(true);
                    }}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 cursor-pointer"
                >
                    <UserPlus size={18} /> Registrar Nuevo Usuario
                </button>
            </div>

            {/* 2. Tabla de Usuarios */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Usuario</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Rol de Acceso</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Miembro desde</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Activo</th>
                                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-zinc-50/30 transition-colors group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-2xl bg-zinc-900 flex items-center justify-center text-white font-black text-xs">
                                                {user.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-zinc-900 text-sm">{user.name}</p>
                                                <p className="text-[11px] text-zinc-400 font-medium">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-tighter ${user.role === 'admin'
                                            ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                            : 'bg-blue-50 text-blue-600 border border-blue-100'
                                            }`}>
                                            <Shield size={10} /> {user.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2 text-zinc-500">
                                            <Calendar size={14} className="text-zinc-300" />
                                            <span className="text-xs font-medium">
                                                {user.createdAt
                                                    ? new Date(user.createdAt).toLocaleDateString('es-MX', {
                                                        timeZone: 'America/Mexico_City',
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })
                                                    : '---'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-tighter ${user.active === true
                                            ? 'bg-green-50 text-green-600 border border-green-100'
                                            : 'bg-red-50 text-red-600 border border-red-100'
                                            }`}>
                                            {
                                                user.active
                                                    ? <SquareCheck size={10} />
                                                    : <OctagonX size={10} />
                                            }
                                            {user.active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <UserActions user={{ id: user.id, name: user.name, role: user.role, active: user.active }} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. Modal de Registro */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md" onClick={() => !isSubmitting && setIsModalOpen(false)} />

                    <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Nuevo Miembro</h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 cursor-pointer">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Mensaje de Error */}
                            {errorMessage && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-2">
                                    <AlertCircle size={16} /> {errorMessage}
                                </div>
                            )}

                            {/* Mensaje de Éxito */}
                            {successMessage && (
                                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-2">
                                    <CheckCircle2 size={16} /> {successMessage}
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 tracking-widest">Nombre Completo</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                        <input
                                            {...register('name', { required: "El nombre es obligatorio" })}
                                            type="text"
                                            className={`w-full pl-12 pr-4 py-3.5 bg-zinc-50 border rounded-2xl text-sm outline-none transition-all ${errors.name ? 'border-red-500' : 'border-zinc-100 focus:bg-white focus:border-zinc-900'}`}
                                            placeholder="Ej. Gregorio Pérez"
                                        />
                                    </div>
                                    {errors.name && <p className="text-red-500 text-[9px] font-bold ml-2 uppercase">{errors.name.message}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 tracking-widest">Correo de acceso</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                        <input
                                            {...register('email', {
                                                required: "El email es obligatorio",
                                                pattern: { value: /^\S+@\S+$/i, message: "Formato de email inválido" }
                                            })}
                                            type="email"
                                            className={`w-full pl-12 pr-4 py-3.5 bg-zinc-50 border rounded-2xl text-sm outline-none transition-all ${errors.email ? 'border-red-500' : 'border-zinc-100 focus:bg-white focus:border-zinc-900'}`}
                                            placeholder="email@ejemplo.com"
                                        />
                                    </div>
                                    {errors.email && <p className="text-red-500 text-[9px] font-bold ml-2 uppercase">{errors.email.message}</p>}
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 tracking-widest">
                                            Contraseña
                                        </label>

                                        <div className="relative group">
                                            {/* Icono de Llave (Izquierda) */}
                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" size={18} />

                                            <input
                                                {...register('password', {
                                                    required: "Obligatoria",
                                                    minLength: { value: 6, message: "Min. 6 caracteres" }
                                                })}
                                                // Cambia dinámicamente entre 'password' y 'text'
                                                type={showPassword ? "text" : "password"}
                                                className={`w-full pl-12 pr-12 py-3.5 bg-zinc-50 border rounded-2xl text-sm outline-none transition-all ${errors.password
                                                    ? 'border-red-500'
                                                    : 'border-zinc-100 focus:bg-white focus:border-zinc-900'
                                                    }`}
                                                placeholder="••••••••"
                                            />

                                            {/* Botón para Mostrar/Ocultar (Derecha) */}
                                            <button
                                                type="button" // IMPORTANTE: type="button" para que no haga submit al formulario
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 transition-colors focus:outline-none p-1"
                                                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                            >
                                                {showPassword ? (
                                                    <EyeOff size={18} strokeWidth={2} />
                                                ) : (
                                                    <Eye size={18} strokeWidth={2} />
                                                )}
                                            </button>
                                        </div>

                                        {errors.password && (
                                            <p className="text-red-500 text-[9px] font-bold ml-2 uppercase animate-in fade-in slide-in-from-left-1">
                                                {errors.password.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 tracking-widest">
                                            Rol de Acceso
                                        </label>

                                        <div className="relative group">
                                            <UserCog
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors pointer-events-none"
                                                size={18}
                                            />

                                            <select
                                                {...register('role', { required: "El rol es obligatorio" })}
                                                // SOLUCIÓN AL ERROR: Usamos defaultValue en lugar de selected en la opción
                                                defaultValue=""
                                                className={`w-full pl-12 pr-10 py-3.5 bg-zinc-50 border rounded-2xl text-sm outline-none transition-all cursor-pointer appearance-none font-medium text-zinc-700
                ${errors.role
                                                        ? 'border-red-500'
                                                        : 'border-zinc-100 focus:bg-white focus:border-zinc-900'
                                                    }`}
                                            >
                                                {/* Quitamos 'selected' de aquí */}
                                                <option value="" disabled className="text-zinc-300">
                                                    Selecciona un rol...
                                                </option>
                                                <option value="recepcionista">Recepcionista</option>
                                                <option value="admin">Administrador</option>
                                                <option value="auxiliar_admin">Auxiliar administrativo</option>
                                            </select>

                                            <ChevronDown
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-zinc-900 transition-transform duration-300 pointer-events-none group-focus-within:rotate-180"
                                                size={16}
                                            />
                                        </div>

                                        {errors.role && (
                                            <p className="text-red-500 text-[9px] font-bold ml-2 uppercase animate-in fade-in">
                                                {errors.role.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !!successMessage}
                                    className="w-full mt-4 py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" /> Creando...
                                        </>
                                    ) : successMessage ? (
                                        <>
                                            <Check size={18} /> ¡Registrado!
                                        </>
                                    ) : (
                                        "Confirmar Registro"
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};