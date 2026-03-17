"use client";

import Link from "next/link";
import { LayoutDashboard, Menu } from "lucide-react";
import { useNavStore } from "@/store/useNavStore";

export const Navbar = () => {
  const toggleSidebar = useNavStore((state) => state.toggleSidebar);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-6 lg:px-12 h-20 flex items-center justify-between">
      <div className="flex items-center gap-8">
        {/* Logo de Danini OPS */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-zinc-900 text-white p-2 rounded-xl shadow-lg shadow-zinc-200 group-hover:scale-105 transition-transform">
            <LayoutDashboard size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-black tracking-tighter text-zinc-900 uppercase text-sm leading-none">Danini OPS</span>
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Management</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Único Trigger del Sidebar para todas las pantallas */}
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-3 px-5 py-2.5 text-zinc-900 bg-zinc-100 hover:bg-zinc-900 hover:text-white rounded-2xl transition-all font-bold text-[11px] uppercase tracking-widest cursor-pointer"
        >
          <span className="hidden sm:block">Menú</span>
          <Menu size={20} />
        </button>
      </div>
    </nav>
  );
}