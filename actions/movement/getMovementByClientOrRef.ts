'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";

export async function searchMovements(term: string, fechaInicioStr: string, fechaFinStr: string) {
    const session = await auth();
    if (!session?.user) return { ok: false, movements: [], message: "No autorizado" };

    try {
        const searchTerm = term.trim();
        if (!searchTerm) return { ok: true, movements: [] };

        // 🟢 1. REGLA DEL DÍA OPERATIVO (7:00 AM a 7:00 AM) BLINDADA PARA SERVERLESS
        const inicioTurno = new Date(`${fechaInicioStr}T07:00:00.000-06:00`);

        const finTurno = new Date(`${fechaFinStr}T07:00:00.000-06:00`);
        finTurno.setDate(finTurno.getDate() + 1); // 7 AM del día siguiente

        // 2. CONSULTA A LA BASE DE DATOS
        const movementsFromDb = await prisma.movimiento.findMany({
            where: {
                // Filtro obligatorio por rango de fechas (usando los turnos de 7AM)
                createdAt: {
                    gte: inicioTurno,
                    lte: finTurno
                },
                OR: [
                    {
                        referencia: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        nombreCliente: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    }
                ]
            },
            include: {
                // 🟢 MISMOS INCLUDES QUE GET DAILY CORTE PARA QUE LA UI NO FALLE
                usuario: { select: { name: true } },
                pagos: {
                    include: { facturasVinculadas: { include: { factura: true } } }
                },
                detalleHotel: true,
                detalleRestaurante: true,
                detalleEvento: true,
                detalleSouvenir: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        // 🟢 3. NORMALIZACIÓN EXACTA A LA DE GET DAILY CORTE
        const movements = movementsFromDb.map((mov: any) => {
            const propinaTotal = mov.pagos.reduce((acc: number, p: any) => acc + Number(p.propina), 0);
            const primerPagoConFactura = mov.pagos.find((p: any) => p.facturasVinculadas?.length > 0);
            const facturaData = primerPagoConFactura?.facturasVinculadas[0]?.factura;

            return {
                ...mov,
                montoNeto: Number(mov.montoNeto),
                propina: propinaTotal,
                requiereFactura: mov.pagos.some((p: any) => p.requiereFactura),
                folioFactura: facturaData?.folio ?? null,
                estaFacturado: mov.pagos.every((p: any) => p.facturado),
                creador: mov.usuario?.name || 'Sistema',

                pagos: mov.pagos.map((p: any) => ({
                    ...p,
                    monto: Number(p.monto),
                    propina: Number(p.propina),
                    facturasVinculadas: p.facturasVinculadas?.map((v: any) => ({
                        ...v,
                        monto: Number(v.monto),
                        factura: v.factura ? {
                            ...v.factura,
                            subtotal: Number(v.factura.subtotal),
                            iva: Number(v.factura.iva),
                            ish: Number(v.factura.ish),
                            total: Number(v.factura.total),
                        } : null
                    })) || [],
                    folioIndividual: p.facturasVinculadas?.[0]?.factura?.folio ?? null
                }))
            };
        });

        return { ok: true, movements };

    } catch (error) {
        console.error("Error en searchMovements:", error);
        return { ok: false, movements: [], message: "Error al realizar la búsqueda" };
    }
}