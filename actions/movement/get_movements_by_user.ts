'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";

export type TipoTurno = 'dia' | 'tarde' | 'noche';

const ORDEN_PRIORIDAD: Record<string, number> = {
    'HOTEL': 1, 'ANTICIPO_HOTEL': 2, 'RESTAURANTE': 3,
    'ANTICIPO_RESTAURANTE': 4, 'EVENTO': 5, 'RENTA_ESPACIOS': 6, 'SOUVENIR': 7
};

export const getMovementsbyUser = async (turno: TipoTurno = 'dia') => {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false, movements: [], message: "No autorizado o sin sesión activa" };
    }

    const userId = session.user.id;

    try {
        // 🟢 CORRECCIÓN: Usar toLocaleDateString para obtener solo "YYYY-MM-DD" limpio
        const ahoraMexicoStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

        const horaActualMexicoStr = new Date().toLocaleTimeString("en-US", { timeZone: "America/Mexico_City", hour12: false });
        const horaActualInt = parseInt(horaActualMexicoStr.split(':')[0], 10);

        let inicioTurno = new Date(`${ahoraMexicoStr}T00:00:00.000-06:00`);
        let finTurno = new Date(`${ahoraMexicoStr}T00:00:00.000-06:00`);

        if (turno === 'dia') {
            inicioTurno = new Date(`${ahoraMexicoStr}T07:00:00.000-06:00`);
            finTurno = new Date(`${ahoraMexicoStr}T15:00:00.000-06:00`);

        } else if (turno === 'tarde') {
            inicioTurno = new Date(`${ahoraMexicoStr}T15:00:00.000-06:00`);
            finTurno = new Date(`${ahoraMexicoStr}T23:00:00.000-06:00`);

        } else if (turno === 'noche') {
            if (horaActualInt < 7) {
                // Estamos en la madrugada. El turno empezó ayer.
                const ayer = new Date(inicioTurno);
                ayer.setDate(ayer.getDate() - 1);
                // 🟢 CORRECCIÓN: Usar toLocaleDateString
                const ayerStr = ayer.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

                inicioTurno = new Date(`${ayerStr}T23:00:00.000-06:00`);
                finTurno = new Date(`${ahoraMexicoStr}T07:00:00.000-06:00`);
            } else {
                // Estamos en la noche. El turno empezó hoy y terminará "mañana".
                const manana = new Date(inicioTurno);
                manana.setDate(manana.getDate() + 1);
                // 🟢 CORRECCIÓN: Usar toLocaleDateString
                const mananaStr = manana.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

                inicioTurno = new Date(`${ahoraMexicoStr}T23:00:00.000-06:00`);
                finTurno = new Date(`${mananaStr}T07:00:00.000-06:00`);
            }
        }

        // 3. CONSULTA A BASE DE DATOS
        const movements = await prisma.movimiento.findMany({
            where: {
                OR: [
                    { createdAt: { gte: inicioTurno, lte: finTurno }, usuarioId: userId },
                    {
                        pagos: {
                            some: {
                                fechaPago: { gte: inicioTurno, lte: finTurno },
                                cajeroId: userId
                            }
                        }
                    }
                ]
            },
            include: {
                pagos: {
                    where: {
                        fechaPago: { gte: inicioTurno, lte: finTurno },
                        cajeroId: userId
                    },
                    include: {
                        facturasVinculadas: {
                            include: { factura: true }
                        }
                    }
                },
                detalleHotel: true,
                detalleRestaurante: true,
                detalleEvento: true,
                detalleSouvenir: true,
            }
        });

        // 4. NORMALIZACIÓN DE DATOS
        const normalizedMovements = movements.map((mov: any) => {
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
                })),
            };
        });

        // 5. ORDENAMIENTO POR PRIORIDAD DE ÁREA
        const sortedMovements = normalizedMovements.sort((a, b) => {
            const pesoA = ORDEN_PRIORIDAD[a.area] || 99;
            const pesoB = ORDEN_PRIORIDAD[b.area] || 99;
            if (pesoA === pesoB) {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return pesoA - pesoB;
        });

        return { ok: true, movements: sortedMovements };

    } catch (error) {
        console.error("Error en getMovementsbyUser:", error);
        return { ok: false, movements: [], message: "Error al cargar los movimientos del cajero" };
    }
};