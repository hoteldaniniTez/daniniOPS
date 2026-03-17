import { MovementTerminal } from "@/components";


export default function MovimientosPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-6 pt-10 pb-20">
            <div className="flex flex-col gap-1 px-4 lg:px-0">
                <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Registro de Movimientos</h1>
                <p className="text-zinc-500 font-light text-sm italic">
                    Ingresa los detalles de la transacción para el corte diario.
                </p>
            </div>

            {/* Componente de Cliente que maneja toda la lógica dinámica */}
            <MovementTerminal />
        </div>
    );
}