export const MiniCard = ({ title, amount, icon, color, isPending }: any) => (
    <div className={`bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm ${isPending ? 'opacity-70 bg-zinc-50' : ''}`}>
        <div className={`flex items-center gap-2 mb-1 ${color}`}>
            {icon}
            <span className="text-[9px] font-black uppercase tracking-tighter">{title}</span>
        </div>
        <p className="text-sm font-black text-zinc-900">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)}</p>
    </div>
);
