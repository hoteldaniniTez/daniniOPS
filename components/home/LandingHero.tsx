"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { create } from 'zustand';

// Store simple para la interacción de la landing
interface LandingStore {
    isHovered: boolean;
    setHovered: (val: boolean) => void;
}

const useLandingStore = create<LandingStore>((set) => ({
    isHovered: false,
    setHovered: (val) => set({ isHovered: val }),
}));

export const LandingHero = () => {
    const { isHovered, setHovered } = useLandingStore();

    return (
        <div
            className="relative group"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Link
                href="/auth/login"
                className="inline-flex items-center gap-4 bg-zinc-900 text-white px-10 py-5 rounded-2xl font-medium transition-all duration-300 hover:bg-zinc-800 hover:shadow-2xl hover:shadow-zinc-300 active:scale-95"
            >
                <span className="text-lg">Entrar al Sistema</span>
                <div className={`transition-all duration-300 ${isHovered ? 'translate-x-2' : ''}`}>
                    <ArrowRight size={20} />
                </div>
            </Link>

            {/* Indicador de estado de módulos */}
            <div className="mt-6 flex items-center gap-4 text-xs">
                <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold">H</div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold">R</div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold">E</div>
                </div>
                {/* <p className="text-zinc-400">
                    <span className="text-zinc-900 font-semibold italic">8 Módulos</span> operativos listos [cite: 10]
                </p> */}
            </div>
        </div>
    );
}