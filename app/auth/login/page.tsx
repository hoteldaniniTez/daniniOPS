import Image from "next/image";
import { LayoutDashboard, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "@/components";

export default function LoginPage() {
    return (
        // Usamos flex-col para móvil y lg:flex-row para escritorio
        <div className="flex flex-col lg:flex-row min-h-screen w-full">

            {/* SECCIÓN IZQUIERDA: Formulario */}
            <div className="flex-1 flex flex-col p-6 sm:p-12 lg:p-20 order-2 lg:order-1 bg-white relative">

                {/* Header: Logo y Volver */}
                <header className="mb-10 lg:mb-20">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors text-[10px] uppercase tracking-[0.2em] font-bold mb-8"
                    >
                        <ChevronLeft size={14} />
                        Volver al inicio
                    </Link>

                    <div className="flex items-center gap-3 text-zinc-900">
                        <div className="bg-zinc-900 text-white p-2.5 rounded-xl shadow-lg flex-none">
                            <LayoutDashboard size={22} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold tracking-tight text-lg leading-none">Hotel Danini</span>
                            <span className="text-[10px] uppercase text-zinc-400 font-medium tracking-widest">Management OPS</span>
                        </div>
                    </div>
                </header>

                {/* Formulario centrado */}
                <div className="max-w-md w-full mx-auto my-auto space-y-8">
                    <div className="space-y-3">
                        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tighter">Acceso Staff</h1>
                        <p className="text-zinc-500 font-light leading-relaxed">
                            Introduce tus credenciales autorizadas para gestionar los ingresos y auditoría del día.
                        </p>
                    </div>
                    <LoginForm />
                </div>

                {/* Footer simple */}
                <footer className="mt-10 lg:mt-auto pt-8">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-medium">
                        Sistema Seguro • Encriptación AES-256
                    </p>
                </footer>
            </div>

            {/* SECCIÓN DERECHA: Imagen */}
            {/* En móvil le damos un alto fijo (30vh), en desktop ocupa el resto */}
            <div className="relative h-[30vh] lg:h-auto lg:w-1/2 order-1 lg:order-2 overflow-hidden border-l border-zinc-100">
                <Image
                    src="https://res.cloudinary.com/dawwp31sm/image/upload/v1694405110/inicio/inicio_oox5il.jpg"
                    alt="Acceso Seguro Danini"
                    fill
                    className="object-cover grayscale-[0.2]"
                    priority
                />
                <div className="absolute inset-0 bg-linear-to-t from-zinc-900/60 via-transparent to-transparent" />

                {/* Texto sobre imagen (solo visible cuando hay espacio) */}
                <div className="absolute bottom-8 left-8 right-8 z-20 hidden sm:block">
                    <p className="text-white text-base lg:text-lg font-light italic leading-snug max-w-sm">
                        "La precisión en el registro es el primer paso hacia la excelencia operativa."
                    </p>
                </div>
            </div>
        </div>
    );
}