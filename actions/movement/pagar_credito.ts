'use server';

import { auth } from "@/auth.config";
import { AuditAction, MetodoPago, TerminalTipo, TipoTarjeta } from "@/lib/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface PagoInput {
    monto: number;
    metodo: MetodoPago;
    propina: number;
    requiereFactura: boolean;
    nombreFactura: string;
    numTerminal?: TerminalTipo | null;
    tipoTarjeta?: TipoTarjeta | null;
    referencia?: string;
}

export const pagarCredito = async (movimientoId: string, pagos: PagoInput[]) => {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false, message: "No autorizado o sin sesión activa" };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Buscamos el movimiento original para validar su estado actual
            const movimientoOriginal = await tx.movimiento.findUnique({
                where: { id: movimientoId },
                include: { pagos: true }
            });

            if (!movimientoOriginal) throw new Error('El movimiento no existe.');

            // 🟢 SEGURIDAD: Evitar liquidar algo que ya está marcado como pagado
            if (movimientoOriginal.pagado) {
                throw new Error('Este crédito ya ha sido liquidado anteriormente.');
            }

            // 2. Actualizar la referencia del pago tipo "crédito" original para dejar rastro
            const fechaMexico = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });

            await tx.pago.updateMany({
                where: {
                    movimientoId: movimientoId,
                    metodo: MetodoPago.credito_cobrar
                },
                data: {
                    // Usamos la fecha convertida
                    referencia: `LIQUIDADO POR ${session.user.name} EL ${fechaMexico}`,
                }
            });

            // 3. Crear los nuevos pagos REALES (Efectivo, Tarjeta, etc.)
            // Usamos un loop simple porque necesitamos el 'connect' por cada pago
            for (const pago of pagos) {
                await tx.pago.create({
                    data: {
                        movimientoId: movimientoId,
                        cajeroId: session.user.id,
                        monto: Number(pago.monto),
                        metodo: pago.metodo,
                        propina: isNaN(Number(pago.propina)) ? 0 : Number(pago.propina),
                        requiereFactura: pago.requiereFactura || false,
                        nombreFactura: pago.nombreFactura || "",
                        numTerminal: pago.metodo === MetodoPago.tarjeta ? (pago.numTerminal || null) : null,
                        tipoTarjeta: pago.metodo === MetodoPago.tarjeta ? (pago.tipoTarjeta || null) : null,
                        referencia: pago.referencia || 'Liquidación de Crédito'
                    }
                });
            }

            // 4. Marcar el movimiento como PAGADO
            await tx.movimiento.update({
                where: { id: movimientoId },
                data: { pagado: true }
            });
        });

        revalidatePath('/recepcion/creditos-por-cobrar');

        return {
            ok: true,
            message: 'Crédito liquidado exitosamente'
        };

    } catch (error: any) {
        console.error("ERROR EN LIQUIDACIÓN:", error.message);
        return {
            ok: false,
            message: error.message || "Ocurrió un error al procesar el pago."
        };
    }
};

export const revertirLiquidacion = async (movimientoId: string, motivo: string) => {
    const session = await auth();

    // 1. Validación de seguridad inicial
    const usuarioId = session?.user?.id;
    if (!usuarioId) {
        return { ok: false, message: 'No autorizado: Sesión no válida.' };
    }

    try {
        const res = await prisma.$transaction(async (tx) => {

            // 2. Verificar integridad: ¿Hay facturas vinculadas a los abonos?
            const pagosLiquidacion = await tx.pago.findMany({
                where: {
                    movimientoId,
                    metodo: { not: MetodoPago.credito_cobrar }
                },
                include: {
                    _count: {
                        select: { facturasVinculadas: true }
                    }
                }
            });

            const tieneFacturas = pagosLiquidacion.some(p => p._count.facturasVinculadas > 0);

            if (tieneFacturas) {
                throw new Error('No se puede revertir: Los abonos ya tienen facturas vinculadas. Elimina las facturas primero.');
            }

            // 3. Capturar instantánea completa para Auditoría (Snapshot antes de borrar)
            const movimientoParaAudit = await tx.movimiento.findUnique({
                where: { id: movimientoId },
                include: {
                    pagos: true, // Esto es vital para ver qué pagos se borraron en el log
                }
            });

            if (!movimientoParaAudit) throw new Error('El movimiento no existe.');

            // 4. Ejecución de la reversión contable

            // a) Borrar físicamente los pagos de la liquidación (los abonos de dinero)
            await tx.pago.deleteMany({
                where: {
                    movimientoId,
                    metodo: { not: MetodoPago.credito_cobrar }
                }
            });

            // b) Regresar el estatus del movimiento a "No Pagado"
            await tx.movimiento.update({
                where: { id: movimientoId },
                data: { pagado: false }
            });

            // c) Marcar el pago de crédito original como restablecido para trazabilidad
            await tx.pago.updateMany({
                where: {
                    movimientoId,
                    metodo: MetodoPago.credito_cobrar
                },
                data: {
                    referencia: 'CRÉDITO RESTABLECIDO (REVERSIÓN DE LIQUIDACIÓN)'
                }
            });

            // 5. Registro en Log de Auditoría
            await tx.auditLog.create({
                data: {
                    usuarioId: usuarioId,
                    usuarioNombre: session.user.name || 'Admin',
                    // Usamos DELETE porque la acción crítica es la eliminación de abonos de dinero
                    accion: AuditAction.DELETE,
                    entityName: 'Eliminación de Liquidación / Restablecimiento de Crédito',
                    entityId: movimientoId,
                    // Combinamos el motivo del usuario con una descripción técnica automática
                    motivo: `ELIMINACIÓN DE ABONOS: ${motivo}. La deuda ha sido restablecida.`,
                    oldValues: JSON.parse(JSON.stringify(movimientoParaAudit))
                }
            });

            return { ok: true, message: 'Liquidación revertida y crédito restablecido correctamente.' };
        });

        // Refrescar los datos en el cliente
        revalidatePath('/recepcion/creditos-por-cobrar');
        return res;

    } catch (error: any) {
        console.error("Error en revertirLiquidacion:", error);
        return {
            ok: false,
            message: error.message || 'Error interno al procesar la reversión.'
        };
    }
};