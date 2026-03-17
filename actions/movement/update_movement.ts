'use server';

import { auth } from "@/auth.config";
import {
    MetodoPago,
    TerminalTipo,
    TipoTarjeta,
    AuditAction,
    AreaType
} from "@/lib/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Esquema de validación para la actualización
const updateMovementSchema = z.object({
    id: z.string().cuid(),
    referencia: z.string().min(1),
    montoNeto: z.number().min(0),
    area: z.nativeEnum(AreaType),
    nombreCliente: z.string().optional().nullable(),
    descripcion: z.string().min(1),

    motivo: z.string().min(5, "Debes especificar un motivo válido"),

    habitaciones: z.string().optional(),
    mesa: z.string().optional(),
    mesero: z.string().optional(),
    comensales: z.coerce.number().optional(),
    areaRentada: z.string().optional(),
    tipoEvento: z.string().optional(),
    nombreSouvenir: z.string().optional(),

    pagos: z.array(z.object({
        id: z.string().optional(), // 🟢 CLAVE 1: Ahora aceptamos el ID del pago si ya existe
        metodo: z.nativeEnum(MetodoPago),
        monto: z.number().positive(),
        propina: z.number().min(0),
        requiereFactura: z.boolean(),
        nombreFactura: z.string().optional(),
        numTerminal: z.nativeEnum(TerminalTipo).optional().nullable(),
        tipoTarjeta: z.nativeEnum(TipoTarjeta).optional().nullable(),
        referencia: z.string().optional().nullable(),
    })).min(1),
});

export async function updateMovement(data: z.infer<typeof updateMovementSchema>) {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            ok: false,
            message: "No autorizado o sin sesión activa"
        };
    }
    try {
        await prisma.$transaction(async (tx) => {
            const oldMovement = await tx.movimiento.findUnique({
                where: { id: data.id },
                include: {
                    pagos: true,
                    detalleHotel: true,
                    detalleRestaurante: true,
                    detalleEvento: true,
                    detalleSouvenir: true
                }
            });

            if (!oldMovement) throw new Error("Movimiento no encontrado");

            let referenciaSegura = data.referencia.trim();

            if (oldMovement.area === 'RESTAURANTE' || oldMovement.area === 'ANTICIPO_RESTAURANTE') {
                if (!referenciaSegura.toUpperCase().startsWith('R-')) {
                    referenciaSegura = `R-${referenciaSegura}`;
                } else {
                    referenciaSegura = referenciaSegura.toUpperCase();
                }
            }

            // 🟢 CLAVE 2: Separamos los pagos en 3 categorías
            // 1. Los IDs que nos mandó el formulario (para saber cuáles NO borrar)
            const incomingPagoIds = data.pagos.map(p => p.id).filter(Boolean) as string[];
            // 2. Los que no tienen ID (El usuario le dio a "+ Agregar Pago")
            const pagosToCreate = data.pagos.filter(p => !p.id);
            // 3. Los que sí tienen ID (Solo editó el monto o método)
            const pagosToUpdate = data.pagos.filter(p => p.id);

            const updatedMovement = await tx.movimiento.update({
                where: { id: data.id },
                data: {
                    referencia: referenciaSegura,
                    area: data.area,
                    montoNeto: data.montoNeto,
                    nombreCliente: data.nombreCliente,
                    descripcion: data.descripcion,

                    // 🟢 CLAVE 3: El Sincronizador Perfecto
                    pagos: {
                        // A) Borramos SOLO los pagos que el usuario quitó
                        deleteMany: {
                            id: { notIn: incomingPagoIds }
                        },
                        // B) Creamos los nuevos (Pero les forzamos la fecha original del movimiento)
                        create: pagosToCreate.map(p => ({
                            metodo: p.metodo,
                            monto: p.monto,
                            propina: p.propina,
                            requiereFactura: p.requiereFactura,
                            nombreFactura: p.nombreFactura,
                            numTerminal: p.numTerminal,
                            tipoTarjeta: p.tipoTarjeta,
                            referencia: p.referencia,
                            cajeroId: session.user.id!,
                            fechaPago: oldMovement.createdAt // Mantiene el pago en su día correcto
                        })),
                        // C) Actualizamos los existentes sin tocar su fecha original ni su relación
                        update: pagosToUpdate.map(p => ({
                            where: { id: p.id },
                            data: {
                                metodo: p.metodo,
                                monto: p.monto,
                                propina: p.propina,
                                requiereFactura: p.requiereFactura,
                                nombreFactura: p.nombreFactura,
                                numTerminal: p.numTerminal,
                                tipoTarjeta: p.tipoTarjeta,
                                referencia: p.referencia,
                            }
                        }))
                    },

                    // ... Todo el resto de tu código de actualización (Detalles de Hotel, Evento, etc) se queda idéntico ...
                    ...(oldMovement.area === 'HOTEL' || oldMovement.area === 'ANTICIPO_HOTEL' ? {
                        detalleHotel: {
                            upsert: {
                                create: { habitaciones: data.habitaciones || "" },
                                update: { habitaciones: data.habitaciones || "" }
                            }
                        }
                    } : {}),

                    ...(oldMovement.area === 'RESTAURANTE' || oldMovement.area === 'ANTICIPO_RESTAURANTE' ? {
                        detalleRestaurante: {
                            upsert: {
                                create: {
                                    mesa: data.mesa || "",
                                    mesero: data.mesero || "",
                                    comensales: Math.floor(Number(data.comensales || 0))
                                },
                                update: {
                                    mesa: data.mesa || "",
                                    mesero: data.mesero || "",
                                    comensales: Math.floor(Number(data.comensales || 0))
                                }
                            }
                        }
                    } : {}),

                    ...(oldMovement.area === 'EVENTO' || oldMovement.area === 'RENTA_ESPACIOS' ? {
                        detalleEvento: {
                            upsert: {
                                create: {
                                    areaRentada: data.areaRentada || "",
                                    tipoEvento: data.tipoEvento || "",
                                },
                                update: {
                                    areaRentada: data.areaRentada || "",
                                    tipoEvento: data.tipoEvento || "",
                                }
                            }
                        }
                    } : {}),

                    ...(oldMovement.area === 'SOUVENIR' ? {
                        detalleSouvenir: {
                            upsert: {
                                create: {
                                    nombre: data.nombreSouvenir || "",
                                },
                                update: {
                                    nombre: data.nombreSouvenir || "",
                                }
                            }
                        }
                    } : {}),
                },
                include: {
                    pagos: true,
                    detalleHotel: true,
                    detalleRestaurante: true,
                    detalleEvento: true,
                    detalleSouvenir: true
                }
            });

            // Registrar en AuditLog (Se mantiene igual)
            await tx.auditLog.create({
                data: {
                    usuarioId: session.user.id!,
                    usuarioNombre: session.user.name || "Usuario Sistema",
                    accion: AuditAction.UPDATE,
                    entityName: "Movimiento",
                    entityId: data.id,
                    motivo: data.motivo,
                    oldValues: JSON.parse(JSON.stringify(oldMovement)),
                    newValues: JSON.parse(JSON.stringify(updatedMovement))
                }
            });

            return updatedMovement;
        });

        revalidatePath('/recepcion/corte');
        return { ok: true, message: "Movimiento actualizado y auditado correctamente" };

    } catch (error: any) {
        // 🟢 NUEVO 3: Atrapamos el error de colisión única (Folio duplicado)
        if (error.code === 'P2002') {
            return {
                ok: false,
                message: `El recibo/comanda no se pudo actualizar porque el recibo/comanda ya existe en la base de datos.`
            };
        }

        console.error("Error en updateMovement:", error);
        return { ok: false, message: error.message || "Error al actualizar el registro" };
    }
}