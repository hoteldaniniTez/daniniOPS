
import { LayoutDashboard, ShieldCheck } from 'lucide-react';
import { LandingHero } from '@/components';
import Image from 'next/image';
import { auth } from '@/auth.config';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect('/recepcion/movimientos')
  }
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white font-sans">

      {/* SECCIÓN IZQUIERDA: Identidad y Control */}
      {/* Cambiamos justify-center por pt-24 en móvil para dar espacio al logo */}
      <div className="flex flex-col justify-start lg:justify-center px-8 sm:px-16 lg:px-24 pt-32 pb-12 lg:py-12 order-2 lg:order-1 relative bg-white">

        {/* Logo: Cambiamos absolute por fixed o ajustamos su comportamiento en móvil */}
        <div className="absolute top-8 left-8 sm:left-16 lg:left-24 flex items-center gap-3 text-zinc-900 z-30">
          <div className="bg-zinc-900 text-white p-2.5 rounded-xl shadow-lg shadow-zinc-200">
            <LayoutDashboard size={22} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-lg leading-none">Hotel Danini</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Management OPS</span>
          </div>
        </div>

        <div className="space-y-10 max-w-lg">
          <div className="space-y-5">
            <span className="inline-block py-1.5 px-4 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-bold tracking-widest uppercase border border-zinc-200">
              Sistema de Gestión de Ingresos v1.0
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 tracking-tighter leading-[1.1] lg:leading-[0.95]">
              Precisión en cada <br />
              <span className="text-zinc-400 italic font-serif font-normal">transacción.</span>
            </h1>
            <p className="text-base lg:text-lg text-zinc-500 leading-relaxed font-light">
              Plataforma integral para el control de ingresos de hotel, restaurante y eventos con auditoría en tiempo real.
            </p>
          </div>

          {/* COMPONENTE INTERACTIVO */}
          <LandingHero />

          {/* Footer Técnico */}
          <div className="pt-12 flex flex-wrap items-center gap-6 text-[10px] lg:text-[11px] text-zinc-400 border-t border-zinc-100 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-zinc-900" />
              <span className="font-semibold text-zinc-900">Acceso Restringido</span>
            </div>
            <span>•</span>
            <p>© {new Date().getFullYear()} Hotel Danini</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN DERECHA: Imagen Estilizada */}
      {/* En móvil la imagen ahora aparece arriba (order-1) con una altura fija para no ocupar toda la pantalla */}
      <div className="hidden lg:block relative h-full bg-zinc-100 order-1 lg:order-2 overflow-hidden">
        <Image
          src="https://res.cloudinary.com/dawwp31sm/image/upload/v1694405110/inicio/inicio_oox5il.jpg"
          alt="Atmósfera Hotel Boutique"
          fill
          className="object-cover grayscale-[0.2] hover:scale-105 transition-transform duration-3000"
          priority
          sizes="50vw"
        />
        {/* Overlay para sofisticar la imagen */}
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950/60 via-transparent to-transparent z-10" />

        {/* Badge flotante sobre la imagen */}
        <div className="absolute bottom-12 left-12 z-20 backdrop-blur-md bg-white/10 border border-white/20 p-6 rounded-2xl max-w-xs">
          <p className="text-white text-sm font-light italic">
            "La tecnología al servicio de la hospitalidad excepcional en Hotel Danini."
          </p>
        </div>
      </div>
    </main>
  );
}