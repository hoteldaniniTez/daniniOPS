import { getMovementsbyUser } from "@/actions";
import { auth } from "@/auth.config";
import { CorteClientView } from "@/components";

export default async function CortePage() {
    const session = await auth();
    const hoy = new Date();

    const opciones: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    let fechaFormateada = hoy.toLocaleDateString('es-MX', opciones);

    fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    const fechaFinal = fechaFormateada.replace(/(\d{4})$/, ' $1');

    const hora = new Date().getHours();
    let turnoInicial: 'dia' | 'tarde' | 'noche' = 'noche';

    if (hora >= 7 && hora < 15) turnoInicial = 'dia';
    else if (hora >= 15 && hora < 23) turnoInicial = 'tarde';

    // Llamada al action con el parámetro correcto
    const { movements = [] } = await getMovementsbyUser(turnoInicial);

    return (
        <div className="max-w-5xl mx-auto space-y-6 pt-10 pb-20">
            <div className="flex flex-col gap-2 px-4 lg:px-0">
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight leading-none">
                    {fechaFinal}
                </h1>
                <div className="flex items-center gap-2 text-sm">
                    <span className="bg-zinc-100 text-zinc-600 px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] border border-zinc-200">
                        {turnoInicial === "dia" ? "1er Turno" : turnoInicial === "tarde" ? "2do Turno" : "3er Turno"}
                    </span>
                    <span className="text-zinc-400 font-medium">•</span>
                    <p className="text-zinc-500 font-medium italic">
                        Generado por <span className="text-zinc-800 not-italic font-bold">{session?.user.name}</span>
                    </p>
                </div>
            </div>
            <CorteClientView
                initialMovements={movements}
                initialTurno={turnoInicial}
            />
        </div>
    );
}