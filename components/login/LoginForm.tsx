"use client";

import { useActionState, useEffect, useState, startTransition } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Mail, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { authenticate } from '@/actions';

export const LoginForm = () => {
    // 1. Estado del Server Action (NextAuth)
    const [state, dispatch, isPending] = useActionState(authenticate, undefined);

    // 2. Estados locales de UI
    const [showPassword, setShowPassword] = useState(false);

    // 3. React Hook Form para validación inmediata (Zod)
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: ""
        }
    });

    // 4. Efecto para redirección exitosa (del primer componente)
    useEffect(() => {
        // console.log(state);
        if (state === 'Success') {
            window.location.replace('/recepcion/movimientos');
        }
    }, [state]);

    // 5. Manejador de envío compatible con ActionState y Transitions
    const onSubmit = async (data: LoginInput) => {
        startTransition(async () => {
            const formData = new FormData();
            formData.append("email", data.email);
            formData.append("password", data.password);

            await dispatch(formData);
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Alerta de Error (Estilo unificado) */}
            {state === "CredentialsSignin" && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={18} />
                    <p className="text-[10px] font-black uppercase tracking-widest">
                        Credenciales incorrectas. Verifica tus datos.
                    </p>
                </div>
            )}

            {/* Campo Email */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">
                    Correo Electrónico
                </label>
                <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" size={18} />
                    <input
                        {...register("email")}
                        type="email"
                        placeholder="usuario@hoteldanini.com"
                        className={`text-gray-700 w-full pl-12 pr-4 py-4 bg-zinc-50 border rounded-2xl outline-none transition-all ${errors.email
                            ? "border-red-500 focus:ring-red-50"
                            : "border-zinc-100 focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100"
                            }`}
                    />
                </div>
                {errors.email && (
                    <p className="text-red-500 text-[9px] font-bold uppercase tracking-wider ml-1 mt-1">
                        {errors.email.message}
                    </p>
                )}
            </div>

            {/* Campo Password */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">
                    Contraseña
                </label>
                <div className="relative group">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" size={18} />
                    <input
                        {...register("password")}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={`text-gray-700 w-full pl-12 pr-12 py-4 bg-zinc-50 border rounded-2xl outline-none transition-all ${errors.password
                            ? "border-red-500 focus:ring-red-50"
                            : "border-zinc-100 focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100"
                            }`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                {errors.password && (
                    <p className="text-red-500 text-[9px] font-bold uppercase tracking-wider ml-1 mt-1">
                        {errors.password.message}
                    </p>
                )}
            </div>

            {/* Botón de Ingreso con Loader Nativo */}
            <button
                type="submit"
                disabled={isPending}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-zinc-200 transition-all flex items-center justify-center gap-3 disabled:opacity-70 active:scale-[0.98] cursor-pointer"
            >
                {isPending ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        <span className="uppercase tracking-widest text-xs font-black">Verificando...</span>
                    </>
                ) : (
                    <span className="uppercase tracking-widest text-xs font-black">Entrar al Sistema</span>
                )}
            </button>

            {/* Divisor Visual */}
            <div className="flex items-center my-6">
                <div className="flex-1 border-t border-zinc-100"></div>
                <div className="px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">O</div>
                <div className="flex-1 border-t border-zinc-100"></div>
            </div>

            <p className="text-center text-zinc-500 text-xs font-medium">
                ¿Problemas con tu acceso? <br />
                <span className="text-zinc-900 font-bold underline cursor-help">Contacta al administrador</span>
            </p>
        </form>
    );
};