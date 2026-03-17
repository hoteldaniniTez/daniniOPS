
'use server';

import { auth } from "@/auth.config";
import { PagoFactura } from "@/interfaces";
import { Prisma } from "@/lib/generated/prisma/client";
import { AreaType, MetodoPago, TipoFactura } from "@/lib/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPendingPayments(params: {
    tipoFactura: 'GLOBAL' | 'INDIVIDUAL' | 'TODAS',
    areaGroup: 'HOTEL' | 'RESTAURANTE' | 'EVENTOS' | 'RENTA ESPACIOS' | 'SOUVENIR' | 'TODAS' | '16%',
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

    const { tipoFactura, areaGroup, fecha } = params;

    const areaMap: Record<string, AreaType[]> = {
        'HOTEL': [AreaType.HOTEL, AreaType.ANTICIPO_HOTEL],
        'RESTAURANTE': [AreaType.RESTAURANTE, AreaType.ANTICIPO_RESTAURANTE],
        'EVENTOS': [AreaType.EVENTO],
        'RENTA ESPACIOS': [AreaType.RENTA_ESPACIOS],
        'SOUVENIR': [AreaType.SOUVENIR],
        '16%': [AreaType.RESTAURANTE, AreaType.ANTICIPO_RESTAURANTE, AreaType.EVENTO, AreaType.RENTA_ESPACIOS, AreaType.SOUVENIR],
        'TODAS': Object.values(AreaType)
    };

    const inicioDia = new Date(`${fecha}T07:00:00.000-06:00`);

    const finDia = new Date(`${fecha}T07:00:00.000-06:00`);
    finDia.setDate(finDia.getDate() + 1);

    try {
        const payments = await prisma.pago.findMany({
            where: {
                facturado: false,
                fechaPago: { gte: inicioDia, lte: finDia },
                ...(tipoFactura !== "TODAS" && { requiereFactura: tipoFactura === "INDIVIDUAL" }),
                // requiereFactura: tipoFactura === 'INDIVIDUAL' ? TipoFactura.INDIVIDUAL : tipoFactura === 'GLOBAL' ? TipoFactura.GLOBAL : TipoFactura.GLOBAL && TipoFactura.INDIVIDUAL,
                movimiento: {
                    area: { in: areaMap[areaGroup] || areaMap['TODAS'] }
                },
                metodo: { in: [MetodoPago.transferencia, MetodoPago.tarjeta, MetodoPago.p_deposito] }
            },

            include: {
                // Incluimos las vinculaciones y la factura
                facturasVinculadas: { include: { factura: true } },
                movimiento: {
                    include: {
                        detalleHotel: true,
                        detalleRestaurante: true,
                        detalleEvento: true,
                        detalleSouvenir: true,
                    }
                }
            },
            orderBy: { fechaPago: 'asc' }
        });

        const plainPayments: PagoFactura[] = payments.map((p: any) => {
            return {
                ...p,
                monto: Number(p.monto),
                propina: Number(p.propina),
                // 1. Limpiamos la lista de facturas vinculadas (Aquí estaba el error)
                facturasVinculadas: p.facturasVinculadas.map((v: any) => ({
                    ...v,
                    monto: Number(v.monto), // <--- ESTA era la línea que faltaba
                    factura: v.factura ? {
                        ...v.factura,
                        subtotal: Number(v.factura.subtotal),
                        iva: Number(v.factura.iva),
                        ish: Number(v.factura.ish),
                        total: Number(v.factura.total),
                    } : null
                })),

                // 2. Para compatibilidad con tu UI actual, extraemos la primera factura si existe
                facturaId: p.facturasVinculadas?.[0]?.facturaId ?? null,
                factura: p.facturasVinculadas?.[0]?.factura ? {
                    ...p.facturasVinculadas[0].factura,
                    subtotal: Number(p.facturasVinculadas[0].factura.subtotal),
                    iva: Number(p.facturasVinculadas[0].factura.iva),
                    ish: Number(p.facturasVinculadas[0].factura.ish),
                    total: Number(p.facturasVinculadas[0].factura.total),
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
        console.error("Error en getPendingPayments:", error);
        return { ok: false, payments: [] };
    }
}

export async function createFactura(data: {
    folio: string;
    tipo: TipoFactura;
    area: AreaType;
    subtotal: number;
    iva: number;
    ish: number;
    total: number;
    detalles: { pagoId: string, montoAFacturar: number }[];
}) {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, message: "No autorizado" };

    try {
        // 🚀 OPTIMIZACIÓN NEON: Traer info de pagos antes de abrir la transacción
        const pagosIds = data.detalles.map(d => d.pagoId);
        const infoPagos = await prisma.pago.findMany({
            where: { id: { in: pagosIds } },
            select: { id: true, monto: true, propina: true }
        });

        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear la Factura
            const nuevaFactura = await tx.factura.create({
                data: {
                    folio: data.folio,
                    tipo: data.tipo,
                    area: data.area,
                    subtotal: data.subtotal,
                    iva: data.iva,
                    ish: data.ish,
                    total: data.total,
                    usuarioId: session.user.id!,
                }
            });

            // 2. Vincular pagos
            for (const item of data.detalles) {
                await tx.facturaDetallePago.create({
                    data: {
                        facturaId: nuevaFactura.id,
                        pagoId: item.pagoId,
                        monto: item.montoAFacturar
                    }
                });

                // Calcular acumulado facturado del pago específico
                const agregados = await tx.facturaDetallePago.aggregate({
                    where: { pagoId: item.pagoId },
                    _sum: { monto: true }
                });

                const pagoOriginal = infoPagos.find(p => p.id === item.pagoId);
                const totalRealPago = Number(pagoOriginal?.monto || 0) + Number(pagoOriginal?.propina || 0);
                const facturadoHastaHoy = Number(agregados._sum.monto || 0);

                // REGLA DE CIERRE: Tolerancia de $1.00 peso para redondeos
                if ((totalRealPago - facturadoHastaHoy) <= 1.00) {
                    await tx.pago.update({
                        where: { id: item.pagoId },
                        data: { facturado: true }
                    });
                }
            }
            return nuevaFactura;
        });

        revalidatePath('/recepcion/facturas');
        return { ok: true, message: `Factura ${data.folio} registrada correctamente` };

    } catch (error) {
        console.error(error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { ok: false, message: "Ese Folio Fiscal ya existe en el sistema." };
        }
        return { ok: false, message: "Error interno al crear la factura." };
    }
}