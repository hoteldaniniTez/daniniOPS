'use server';

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteMovement(id: string, motivo: string) {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, message: "No autorizado" };

    try {
        // Quitamos el 'return' de aquí para manejar la respuesta nosotros
        const result = await prisma.$transaction(async (tx) => {
            const movement = await tx.movimiento.findUnique({
                where: { id },
                include: {
                    pagos: {
                        include: { facturasVinculadas: { include: { factura: true } } }
                    },
                    detalleHotel: true,
                    detalleRestaurante: true,
                    detalleEvento: true,
                    detalleSouvenir: true
                }
            });

            if (!movement) throw new Error("Movimiento no encontrado");

            const facturasIds = movement.pagos.flatMap(p => p.facturasVinculadas.map(fv => fv.factura.folio));

            if (facturasIds.length > 0) {
                // 🟢 CAMBIO CLAVE: Lanzamos un error real para abortar la transacción
                throw new Error(`BLOQUEO_FACTURA:${facturasIds.join(", ")}`);
            }

            await tx.auditLog.create({
                data: {
                    usuarioId: session.user.id!,
                    usuarioNombre: session.user.name || "Usuario",
                    accion: "DELETE",
                    entityName: "Movimiento",
                    entityId: id,
                    motivo: motivo,
                    oldValues: JSON.parse(JSON.stringify(movement))
                }
            });

            await tx.movimiento.delete({ where: { id } });
            return { ok: true };
        });

        // Si llegó aquí, todo salió bien
        revalidatePath('/recepcion/corte');
        revalidatePath('/admin/reportes');
        return { ok: true, message: "Movimiento eliminado correctamente" };

    } catch (error: any) {
        console.error("Error en deleteMovement:", error.message);

        // 🟢 MANEJO DEL ERROR PERSONALIZADO
        if (error.message.startsWith("BLOQUEO_FACTURA:")) {
            const folios = error.message.replace("BLOQUEO_FACTURA:", "");
            return {
                ok: false,
                message: `No se puede eliminar: Este movimiento está vinculado a la(s) factura(s): ${folios}. Debes cancelar o desvincular la factura primero.`
            };
        }

        return { ok: false, message: "No se pudo eliminar el registro por un error interno." };
    }
}