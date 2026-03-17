'use server';

import { auth } from "@/auth.config";
import { MetodoPago, TerminalTipo, TipoTarjeta } from "@/lib/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface PagoLiquidar {
    metodo: MetodoPago;
    monto: number;
    numTerminal?: TerminalTipo;
    tipoTarjeta?: TipoTarjeta;
}

export async function liquidarCredito(movimientoId: string, pagos: PagoLiquidar[]) {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            ok: false,
            message: "No autorizado o sin sesión activa"
        };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Crear los pagos reales
            await tx.pago.createMany({
                data: pagos.map(p => ({
                    movimientoId,
                    monto: p.monto,
                    metodo: p.metodo,
                    numTerminal: p.numTerminal,
                    tipoTarjeta: p.tipoTarjeta,
                    cajeroId: session.user.id!
                }))
            });

            // 2. Marcar como pagado
            await tx.movimiento.update({
                where: { id: movimientoId },
                data: { pagado: true }
            });
        });

        revalidatePath('/recepcion/creditos');
        return { ok: true, message: "Crédito liquidado con éxito" };
    } catch (error) {
        return { ok: false, message: "Error al procesar la transacción" };
    }
}