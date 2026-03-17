import { getMovementsbyUser } from "@/actions";
import { auth } from "@/auth.config";
import { CorteClientView } from "@/components";

export default async function CortePage() {
    const session = await auth();

    // 1. Configuración de Zona Horaria (Crucial para Vercel)
    const timeZone = 'America/Mexico_City';
    const ahora = new Date();

    // 2. Formateo de Fecha Robusto
    const opciones: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: timeZone // Fuerza a que la fecha sea la de México
    };

    let fechaFormateada = ahora.toLocaleDateString('es-MX', opciones);

    // Capitalizar y ajustar formato
    fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    const fechaFinal = fechaFormateada.replace(/(\d{4})$/, ' $1');

    // 3. Cálculo de Hora Local (Fuerza la hora de México para el turno)
    const horaLocal = parseInt(
        new Intl.DateTimeFormat("es-MX", {
            hour: "numeric",
            hour12: false,
            timeZone: timeZone,
        }).format(ahora)
    );

    // 4. Lógica de Turnos Automática
    let turnoInicial: 'dia' | 'tarde' | 'noche' = 'noche';

    if (horaLocal >= 7 && horaLocal < 15) {
        turnoInicial = 'dia';
    } else if (horaLocal >= 15 && horaLocal < 23) {
        turnoInicial = 'tarde';
    }
    // De 23:00 a 06:59 cae en el default 'noche'

    // 5. Llamada a la Base de Datos (Neon) con el turno correcto
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
                        Generado por <span className="text-zinc-800 not-italic font-bold">{session?.user?.name || 'Usuario'}</span>
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