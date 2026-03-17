'use server';

import { auth } from "@/auth.config";
import { AuditAction, TipoFactura } from "@/lib/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { PagoFactura } from "@/interfaces";

export async function getSuccessPayments(params: {
    tipoFactura: TipoFactura,
    fecha: string
}) {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            ok: false,
            payments: [],
            message: "No autorizado o sin sesión activa"
        };
    }


    const { tipoFactura, fecha } = params;

    const inicioDia = new Date(`${fecha}T07:00:00.000-06:00`);
    const finDia = new Date(`${fecha}T07:00:00.000-06:00`);
    finDia.setDate(finDia.getDate() + 1);

    try {
        // 1. Buscamos directamente en la tabla intermedia para obtener cada factura por separado
        const vinculaciones = await prisma.facturaDetallePago.findMany({
            where: {
                factura: {
                    createdAt: { gte: inicioDia, lte: finDia },
                    tipo: tipoFactura
                }
            },
            include: {
                factura: true,
                pago: {
                    include: {
                        movimiento: {
                            include: {
                                detalleHotel: true,
                                detalleRestaurante: true,
                                detalleEvento: true,
                                detalleSouvenir: true,
                            }
                        }
                    }
                }
            },
            orderBy: { factura: { createdAt: 'asc' } }
        }) as any[];

        // 2. Mapeamos las vinculaciones al formato PagoFactura para el Frontend
        const plainPayments: PagoFactura[] = vinculaciones.map(v => {
            const p = v.pago;
            return {
                ...p,
                // ID único compuesto para evitar colisiones en la lista de React
                id: `${p.id}-${v.facturaId}`,
                monto: Number(v.monto), // Mostramos el monto de esta factura específica
                propina: Number(p.propina),
                facturaId: v.facturaId,
                factura: v.factura ? {
                    ...v.factura,
                    subtotal: Number(v.factura.subtotal),
                    iva: Number(v.factura.iva),
                    ish: Number(v.factura.ish),
                    total: Number(v.factura.total),
                } : null,
                movimiento: {
                    ...p.movimiento,
                    montoNeto: Number(p.movimiento.montoNeto),
                    detalleHotel: p.movimiento.detalleHotel ?? null,
                    detalleRestaurante: p.movimiento.detalleRestaurante ?? null,
                    detalleEvento: p.movimiento.detalleEvento ?? null,
                    detalleSouvenir: p.movimiento.detalleSouvenir ?? null,
                }
            };
        });

        return { ok: true, payments: plainPayments };
    } catch (error) {
        console.error("Error en getSuccessPayments:", error);
        return { ok: false, payments: [] };
    }
}

export async function searchFacturas(query: string) {
    const session = await auth();
    if (!session?.user) return { ok: false, payments: [] };

    const search = query.trim();

    try {
        // Buscamos en la tabla intermedia para obtener desgloses individuales
        const vinculaciones = await prisma.facturaDetallePago.findMany({
            where: {
                OR: [
                    // 1. Búsqueda por Folio SAT
                    { factura: { folio: { contains: search, mode: 'insensitive' } } },
                    // 2. Búsqueda por Referencia de Movimiento
                    { pago: { movimiento: { referencia: { contains: search, mode: 'insensitive' } } } },
                    // 3. Búsqueda por Nombre en el Pago
                    { pago: { nombreFactura: { contains: search, mode: 'insensitive' } } },
                    // 4. Búsqueda por Nombre en el Movimiento (Cliente)
                    { pago: { movimiento: { nombreCliente: { contains: search, mode: 'insensitive' } } } }
                ]
            },
            include: {
                factura: true,
                pago: {
                    include: {
                        movimiento: {
                            include: {
                                detalleHotel: true,
                                detalleRestaurante: true,
                                detalleEvento: true,
                                detalleSouvenir: true,
                            }
                        }
                    }
                }
            },
            orderBy: { factura: { createdAt: 'desc' } }
        }) as any[];

        if (vinculaciones.length === 0) return { ok: false, message: "No se encontraron coincidencias" };

        // Normalización y transformación a PagoFactura[]
        const plainPayments: PagoFactura[] = vinculaciones.map(v => {
            const p = v.pago;
            return {
                ...p,
                // ID único compuesto para evitar errores en listas de React
                id: `${p.id}-${v.facturaId}`,
                monto: Number(v.monto), // Monto específico de esta factura
                propina: Number(p.propina),
                facturaId: v.facturaId,
                factura: v.factura ? {
                    ...v.factura,
                    subtotal: Number(v.factura.subtotal),
                    iva: Number(v.factura.iva),
                    ish: Number(v.factura.ish),
                    total: Number(v.factura.total),
                } : null,
                movimiento: {
                    ...p.movimiento,
                    montoNeto: Number(p.movimiento.montoNeto),
                    detalleHotel: p.movimiento.detalleHotel ?? null,
                    detalleRestaurante: p.movimiento.detalleRestaurante ?? null,
                    detalleEvento: p.movimiento.detalleEvento ?? null,
                    detalleSouvenir: p.movimiento.detalleSouvenir ?? null,
                }
            };
        });

        return { ok: true, payments: plainPayments };
    } catch (error) {
        console.error("Error en búsqueda universal:", error);
        return { ok: false, message: "Error al realizar la búsqueda" };
    }
}

export async function deleteFacturas(facturaIds: string[], motivo: string) {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, message: "No autorizado" };

    try {
        // 🚀 OPTIMIZACIÓN NEON: Captura de rastro forense ANTES de la transacción
        // Traemos las facturas, sus desgloses, los pagos y las referencias de movimientos
        const facturasCompletas = await prisma.factura.findMany({
            where: { id: { in: facturaIds } },
            include: {
                detallesPago: {
                    include: {
                        pago: {
                            include: { movimiento: { select: { referencia: true } } }
                        }
                    }
                }
            }
        });

        if (facturasCompletas.length === 0) return { ok: false, message: "No se encontraron las facturas" };

        const foliosCadeba = facturasCompletas.map(f => f.folio).join(", ");

        // Mapeamos los IDs de pagos afectados para re-evaluarlos
        const pagoIdsAfectados = Array.from(
            new Set(facturasCompletas.flatMap(f => f.detallesPago.map(d => d.pagoId)))
        );

        // Traemos montos originales de esos pagos en una sola consulta
        const infoPagos = await prisma.pago.findMany({
            where: { id: { in: pagoIdsAfectados } },
            select: { id: true, monto: true, propina: true }
        });

        await prisma.$transaction(async (tx) => {
            // 1. Borrar las relaciones en la tabla intermedia
            await tx.facturaDetallePago.deleteMany({
                where: { facturaId: { in: facturaIds } }
            });

            // 2. Re-evaluar estado de facturado para cada pago afectado
            for (const id of pagoIdsAfectados) {
                const sumaRestante = await tx.facturaDetallePago.aggregate({
                    where: { pagoId: id },
                    _sum: { monto: true }
                });

                const pOriginal = infoPagos.find(p => p.id === id);
                const totalRealPago = Number(pOriginal?.monto || 0) + Number(pOriginal?.propina || 0);
                const montoFacturadoAun = Number(sumaRestante._sum.monto || 0);

                // Si tras borrar, lo que queda facturado es menor al total, reabrimos el pago
                // Usamos tolerancia de $1.00 para evitar errores de redondeo
                if ((totalRealPago - montoFacturadoAun) > 1.00) {
                    await tx.pago.update({
                        where: { id },
                        data: { facturado: false }
                    });
                }
            }

            // 3. Borrar físicamente las facturas
            await tx.factura.deleteMany({
                where: { id: { in: facturaIds } }
            });

            // 4. CREAR LOG DE AUDITORÍA CON DETALLE FORENSE
            await tx.auditLog.create({
                data: {
                    usuarioId: session.user.id!,
                    usuarioNombre: session.user.name || 'Admin',
                    accion: AuditAction.DELETE,
                    entityName: 'Factura',
                    entityId: foliosCadeba,
                    motivo: motivo,
                    oldValues: {
                        tipo: "LOTE_FACTURAS_DETALLADO",
                        registros: facturasCompletas.map(f => ({
                            folio: f.folio,
                            total: Number(f.total),
                            area: f.area,
                            vinculos: f.detallesPago.map(d => ({
                                montoVinculado: Number(d.monto),
                                referenciaMov: d.pago.movimiento.referencia,
                                metodoPago: d.pago.metodo
                            }))
                        }))
                    }
                }
            });
        });

        revalidatePath('/recepcion/facturas');
        return { ok: true, message: `Se han revertido ${facturasCompletas.length} factura(s) exitosamente.` };

    } catch (error) {
        console.error("ERROR_DELETE_FACTURA:", error);
        return { ok: false, message: "Error interno al procesar la desvinculación fiscal." };
    }
}