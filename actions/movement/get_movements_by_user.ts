'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";

export type TipoTurno = 'dia' | 'tarde' | 'noche';

const ORDEN_PRIORIDAD: Record<string, number> = {
    'HOTEL': 1, 'ANTICIPO_HOTEL': 2, 'RESTAURANTE': 3,
    'ANTICIPO_RESTAURANTE': 4, 'EVENTO': 5, 'RENTA_ESPACIOS': 6, 'SOUVENIR': 7
};

export const getMovementsbyUser = async () => {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false, movements: [], message: "No autorizado o sin sesión activa" };
    }

    const userId = session.user.id;
    const timeZone = "America/Mexico_City";

    try {
        const ahora = new Date();

        // 1. Obtenemos solo la hora en formato CDMX para evaluar si pasaron las 7 AM
        const horaActualStr = ahora.toLocaleTimeString("en-US", { timeZone, hour12: false });
        const horaActualInt = parseInt(horaActualStr.split(':')[0], 10);

        // 2. Función blindada para obtener YYYY-MM-DD sin importar el UTC del servidor
        const getDateString = (daysOffset: number) => {
            const date = new Date(ahora);
            // Sumamos o restamos 24 horas en milisegundos
            date.setTime(date.getTime() + daysOffset * 24 * 60 * 60 * 1000);
            return date.toLocaleDateString("en-CA", { timeZone });
        };

        let inicioTurno: Date;
        let finTurno: Date;

        // 3. Lógica de Día Hotelero
        if (horaActualInt >= 7) {
            // Día normal: de HOY a las 7:00 AM hasta MAÑANA a las 7:00 AM
            const hoyStr = getDateString(0);
            const mananaStr = getDateString(1);

            // Usamos -06:00 fijo porque México ya no tiene horario de verano
            inicioTurno = new Date(`${hoyStr}T07:00:00.000-06:00`);
            finTurno = new Date(`${mananaStr}T07:00:00.000-06:00`);
        } else {
            // Madrugada: El día hotelero empezó AYER a las 7:00 AM y termina HOY a las 7:00 AM
            const ayerStr = getDateString(-1);
            const hoyStr = getDateString(0);

            inicioTurno = new Date(`${ayerStr}T07:00:00.000-06:00`);
            finTurno = new Date(`${hoyStr}T07:00:00.000-06:00`);
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