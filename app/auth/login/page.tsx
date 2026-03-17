
import Image from "next/image";
import { LayoutDashboard, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "@/components";

export default function LoginPage() {
    return (
        <>
            {/* SECCIÓN IZQUIERDA: Formulario e Identidad */}
            <div className="flex flex-col justify-start lg:justify-center px-8 sm:px-16 lg:px-24 pt-32 pb-12 lg:py-12 order-2 lg:order-1 relative bg-white">

                {/* Navegación y Logo */}
                <div className="absolute top-8 left-8 sm:left-16 lg:left-24 flex flex-col gap-6 z-30">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors text-[10px] uppercase tracking-[0.2em] font-bold"
                    >
                        <ChevronLeft size={14} />
                        Volver al inicio
                    </Link>

                    <div className="flex items-center gap-3 text-zinc-900">
                        <div className="bg-zinc-900 text-white p-2.5 rounded-xl shadow-lg shadow-zinc-200">
                            <LayoutDashboard size={22} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold tracking-tight text-lg leading-none">Hotel Danini</span>
                            <span className="text-[10px] uppercase text-zinc-400 font-medium tracking-widest">Management OPS</span>
                        </div>
                    </div>
                </div>

                <div className="max-w-md w-full mx-auto space-y-8">
                    <div className="space-y-3">
                        <h1 className="text-4xl font-bold text-zinc-900 tracking-tighter">Acceso Staff</h1>
                        <p className="text-zinc-500 font-light leading-relaxed">
                            Introduce tus credenciales autorizadas para gestionar los ingresos y auditoría del día.
                        </p>
                    </div>

                    {/* COMPONENTE DE CLIENTE: El formulario interactivo */}
                    <LoginForm />
                </div>

                <footer className="absolute bottom-8 left-8 sm:left-16 lg:left-24">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-medium">
                        Sistema Seguro • Encriptación AES-256
                    </p>
                </footer>
            </div>

            {/* SECCIÓN DERECHA: Visual de Lujo (Responsiva) */}
            <div className="relative h-[25vh] lg:h-full bg-zinc-100 order-1 lg:order-2 overflow-hidden border-l border-zinc-50">
                <Image
                    src="https://res.cloudinary.com/dawwp31sm/image/upload/v1694405110/inicio/inicio_oox5il.jpg"
                    alt="Acceso Seguro Danini"
                    fill
                    className="object-cover grayscale-[0.3]"
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-linear-to-t from-zinc-950/80 lg:from-zinc-950/60 via-transparent to-transparent z-10" />

                <div className="hidden lg:block absolute bottom-12 left-12 z-20 max-w-sm">
                    <p className="text-white text-lg font-light italic leading-snug">
                        "La precisión en el registro es el primer paso hacia la excelencia operativa."
                    </p>
                </div>
            </div>
        </>
    );
}