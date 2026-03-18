import { getMovementsbyUser } from "@/actions";
import { auth } from "@/auth.config";
import { CorteClientView } from "@/components";

export default async function CortePage() {
    const session = await auth();

    // 1. Configuración de Zona Horaria
    const timeZone = 'America/Mexico_City';
    const ahora = new Date();

    // 2. Obtener la hora local exacta para saber en qué "Día Hotelero" estamos
    const horaLocal = parseInt(
        new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            hour12: false,
            timeZone: timeZone,
        }).format(ahora)
    );

    // 3. Cálculo de la Fecha Hotelera (Si son antes de las 7 AM, sigue siendo el día de ayer operativamente)
    const fechaLogica = new Date(ahora);
    if (horaLocal < 7) {
        fechaLogica.setDate(fechaLogica.getDate() - 1);
    }

    // 4. Formateo de Fecha Robusto
    const opciones: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: timeZone
    };

    let fechaFormateada = fechaLogica.toLocaleDateString('es-MX', opciones);
    fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    const fechaFinal = fechaFormateada.replace(/(\d{4})$/, ' $1');

    // 5. Llamada a la Base de Datos (Ya no pasamos turno, calculará las 24 hrs automáticamente)
    const { movements = [] } = await getMovementsbyUser();

    return (
        <div className="max-w-5xl mx-auto space-y-6 pt-10 pb-20">
            <div className="flex flex-col gap-2 px-4 lg:px-0">
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight leading-none">
                    {fechaFinal}
                </h1>

                <div className="flex items-center gap-2 text-sm">
                    <span className="bg-zinc-100 text-zinc-600 px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] border border-zinc-200">
                        Corte De Caja
                    </span>

                    <span className="text-zinc-400 font-medium">•</span>

                    <p className="text-zinc-500 font-medium italic">
                        Generado por <span className="text-zinc-800 not-italic font-bold">{session?.user?.name || 'Usuario'}</span>
                    </p>
                </div>
            </div>

            <CorteClientView
                initialMovements={movements}
                initialTurno="dia" // Mandamos un default por si tu componente cliente lo requiere
            />
        </div>
    );
}