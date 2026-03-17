'use server';

import { auth } from "@/auth.config";
import { Prisma } from "@/lib/generated/prisma/client";
import { AreaType, MetodoPago, TerminalTipo, TipoTarjeta } from "@/lib/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const paymentSchema = z.object({
    metodo: z.nativeEnum(MetodoPago),
    monto: z.number().min(0),
    propina: z.number().min(0).default(0),
    requiereFactura: z.boolean(),
    nombreFactura: z.string().optional().nullable(),
    facturado: z.boolean().default(false),
    numTerminal: z.nativeEnum(TerminalTipo).optional().nullable(),
    tipoTarjeta: z.nativeEnum(TipoTarjeta).optional().nullable(),
    referencia: z.string().optional().nullable(),
}).refine((data) => {
    // 🟢 VALIDACIÓN OBLIGATORIA: Si es cupón, la referencia (folio del cupón) no puede estar vacía
    if (data.metodo === MetodoPago.cupon && (!data.referencia || data.referencia.trim() === "")) {
        return false;
    }
    return true;
}, {
    message: "El folio del cupón es obligatorio para pagos con Cupón Desayuno",
    path: ["referencia"]
});

const movementSchema = z.object({
    area: z.nativeEnum(AreaType),
    referencia: z.string().min(1),
    montoNeto: z.number().min(0),
    propina: z.number().default(0),
    descripcion: z.string().optional().nullable(),
    nombreCliente: z.string().optional().nullable(),
    pagos: z.array(paymentSchema).min(1),
    habitaciones: z.string().optional(),
    mesero: z.string().optional(),
    mesa: z.string().optional(),
    comensales: z.coerce.number().optional(),
    areaRentada: z.string().optional(),
    tipoEvento: z.string().optional(),
    nombreSouvenir: z.string().optional(),
});

export async function createMovement(data: z.infer<typeof movementSchema>) {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            ok: false,
            message: "No autorizado o sin sesión activa"
        };
    }

    const userId = session.user.id;

    // ✅ Lógica de negocio: 
    // 'credito_cobrar' marca como no pagado. 
    // 'cupon' SI cuenta como pagado (porque ya se cobró previamente en recepción).
    const esCredito = data.pagos.some(p => p.metodo === MetodoPago.credito_cobrar);
    const estaPagado = !esCredito;

    // ✅ Validación de integridad financiera
    const sumaPagos = data.pagos.reduce((acc, p) => acc + p.monto + p.propina, 0);
    if (Math.abs(sumaPagos - data.montoNeto) > 0.01 && !esCredito) {
        return {
            ok: false,
            message: `La suma de pagos ($${sumaPagos.toFixed(2)}) no coincide con el total del movimiento ($${data.montoNeto.toFixed(2)}).`
        };
    }

    let referenciaSegura = data.referencia.trim();

    if (data.area === 'RESTAURANTE' || data.area === 'ANTICIPO_RESTAURANTE') {
        // Si no empieza con R- (sin importar mayúsculas o minúsculas), se lo agregamos
        if (!referenciaSegura.toUpperCase().startsWith('R-')) {
            referenciaSegura = `R-${referenciaSegura}`;
        } else {
            // Si el recepcionista ya lo puso, solo nos aseguramos de que sea mayúscula
            referenciaSegura = referenciaSegura.toUpperCase();
        }
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const movimiento = await tx.movimiento.create({
                data: {
                    area: data.area,
                    referencia: referenciaSegura,
                    montoNeto: data.montoNeto,
                    descripcion: data.descripcion,
                    nombreCliente: data.nombreCliente,
                    usuario: { connect: { id: session.user.id } },
                    pagado: estaPagado,
                    pagos: {
                        create: data.pagos.map(p => ({
                            monto: p.monto,
                            metodo: p.metodo,
                            propina: p.propina,
                            requiereFactura: p.requiereFactura,
                            nombreFactura: p.requiereFactura ? p.nombreFactura : null,
                            facturado: false,
                            referencia: p.referencia,
                            numTerminal: p.metodo === MetodoPago.tarjeta ? p.numTerminal as TerminalTipo : null,
                            tipoTarjeta: p.metodo === MetodoPago.tarjeta ? p.tipoTarjeta as TipoTarjeta : null,
                            cajeroId: userId
                        }))
                    },
                    // ... el resto de tus conexiones (detalleHotel, detalleRestaurante, etc.) quedan igual
                    ...((data.area === 'HOTEL' || data.area === 'ANTICIPO_HOTEL') && {
                        detalleHotel: { create: { habitaciones: data.habitaciones || "" } }
                    }),
                    ...((data.area === 'RESTAURANTE' || data.area === 'ANTICIPO_RESTAURANTE') && {
                        detalleRestaurante: {
                            create: {
                                mesero: data.mesero || "",
                                mesa: data.mesa || "",
                                comensales: Math.floor(Number(data.comensales || 0))
                            }
                        }
                    }),
                    ...((data.area === 'EVENTO' || data.area === 'RENTA_ESPACIOS') && {
                        detalleEvento: {
                            create: {
                                areaRentada: data.areaRentada || "",
                                tipoEvento: data.tipoEvento || ""
                            }
                        }
                    }),
                    ...(data.area === 'SOUVENIR' && {
                        detalleSouvenir: { create: { nombre: data.nombreSouvenir || "" } }
                    })
                }
            });
            return movimiento;
        });

        revalidatePath('/recepcion/movimientos');
        return { ok: true, id: result.id };

    } catch (error) {
        // ... manejo de errores igual
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return {
                    ok: false,
                    message: `La referencia "${data.referencia}" ya existe. Por favor, verifica el folio.`
                };
            }
        }
        console.error("Error en createMovement:", error);
        return { ok: false, message: "Error inesperado al guardar el movimiento" };
    }
}