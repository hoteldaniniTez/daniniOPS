import { getMovementsCredits } from "@/actions";
import { CreditosClientView, Pagination } from "@/components";

interface Props {
    searchParams: Promise<{
        filtro?: 'todos' | 'pagados' | 'pendientes';
        search?: string;
        inicio?: string;
        fin?: string;
        page?: string;
    }>
}

export default async function CreditosPorCobrarPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = params.page ? parseInt(params.page) : 1;

    // 🟢 1. Cálculo automático de rango (7 días atrás)
    const hoy = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(hoy.getDate() - 7);

    // Formateamos para los inputs (YYYY-MM-DD) usando la zona de México
    const hoyStr = hoy.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    const hace7DiasStr = hace7Dias.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

    // 🟢 2. Asignación de valores por defecto
    const filtro = params.filtro || 'todos';
    const search = params.search || '';
    const inicio = params.inicio || hace7DiasStr;
    const fin = params.fin || hoyStr;

    const { movements, totalPages } = await getMovementsCredits({
        filtro,
        searchTerm: search,
        fechaInicio: inicio,
        fechaFin: fin,
        page: page,
    });

    return (
        <div className="max-w-5xl mx-auto space-y-6 pt-10 pb-20">
            <div className="flex flex-col gap-3 px-4 lg:px-0">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tighter leading-none uppercase italic">
                        Gestión de Créditos
                    </h1>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 italic">
                        Cuentas por Cobrar • Rango: {inicio} al {fin}
                    </p>
                </div>
            </div>

            <CreditosClientView
                movements={movements}
                currentFiltro={filtro as any}
                currentSearch={search}
                currentInicio={inicio}
                currentFin={fin}
            />

            <Pagination totalPages={totalPages || 0} />
        </div>
    );
}