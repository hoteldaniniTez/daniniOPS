import { formatCurrency } from "@/utils";

export const KPICard = ({ title, amount, icon, color, isMain, subtitle }: any) => (
    <div className={`${color} p-6 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between h-36 transition-transform hover:scale-[1.02]`}>
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</span>
                <p className="text-[9px] font-medium opacity-60 italic">{subtitle}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-xl">{icon}</div>
        </div>
        <p className={`${isMain ? 'text-4xl' : 'text-3xl'} font-black`}>{typeof amount === 'number'
            ? formatCurrency(amount)
            : amount}</p>
    </div>
);