'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";

// Constante para ordenar la tabla visualmente según la importancia del área
const ORDEN_PRIORIDAD: Record<string, number> = {
    'HOTEL': 1, 'ANTICIPO_HOTEL': 2, 'RESTAURANTE': 3,
    'ANTICIPO_RESTAURANTE': 4, 'EVENTO': 5, 'RENTA_ESPACIOS': 6, 'SOUVENIR': 7
};

export const getDailyCorteMovements = async (fechaInicioStr: string, fechaFinStr: string) => {
    // 1. VALIDACIÓN DE AUTENTICACIÓN Y ROLES
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false, movements: [], message: "No autorizado o sin sesión activa" };
    }

    const rolesPermitidos = ["admin", "auxiliar_admin"];
    if (!rolesPermitidos.includes(session.user.role)) {
        return { ok: false, movements: [], message: "El usuario debe estar autenticado como administrador o auxiliar" };
    }

    try {
        // 2. CÁLCULO DEL "DÍA OPERATIVO" BLINDADO PARA SERVERLESS (UTC-6 / Hora Centro de México)
        // Forzamos el offset horario (-06:00) en el string ISO para que Vercel (UTC) no nos cambie la hora.

        // Inicio: 7:00 AM del primer día seleccionado
        const inicioTurno = new Date(`${fechaInicioStr}T07:00:00.000-06:00`);

        // Fin: 7:00 AM del DÍA SIGUIENTE al último día seleccionado
        const finTurno = new Date(`${fechaFinStr}T07:00:00.000-06:00`);
        finTurno.setDate(finTurno.getDate() + 1); // Javascript maneja automáticamente los cambios de mes aquí

        // 3. CONSULTA A LA BASE DE DATOS (NEON DB)
        const movements = await prisma.movimiento.findMany({
            where: {
                OR: [
                    // Movimientos creados en el rango
                    { createdAt: { gte: inicioTurno, lte: finTurno } },
                    // O movimientos antiguos que recibieron un pago en este rango (ej. liquidación de créditos)
                    { pagos: { some: { fechaPago: { gte: inicioTurno, lte: finTurno } } } }
                ]
            },
            include: {
                usuario: {
                    select: { name: true }
                },
                pagos: {
                    // Filtramos para traer SOLO los pagos que cayeron en este rango operativo
                    where: { fechaPago: { gte: inicioTurno, lte: finTurno } },
                    include: { facturasVinculadas: { include: { factura: true } } }
                },
                detalleHotel: true,
                detalleRestaurante: true,
                detalleEvento: true,
                detalleSouvenir: true,
            }
        });

        // 4. NORMALIZACIÓN DE DATOS (Transformación para el Frontend)
        const normalizedMovements = movements.map((mov: any) => {
            // Cálculos rápidos por movimiento
            const propinaTotal = mov.pagos.reduce((acc: number, p: any) => acc + Number(p.propina), 0);
            const primerPagoConFactura = mov.pagos.find((p: any) => p.facturasVinculadas.length > 0);
            const facturaData = primerPagoConFactura?.facturasVinculadas[0]?.factura;

            return {
                ...mov,
                montoNeto: Number(mov.montoNeto),
                propina: propinaTotal,
                requiereFactura: mov.pagos.some((p: any) => p.requiereFactura),
                folioFactura: facturaData?.folio ?? null,
                estaFacturado: mov.pagos.every((p: any) => p.facturado),
                creador: mov.usuario?.name || 'Sistema',

                // Normalizamos el arreglo de pagos
                pagos: mov.pagos.map((p: any) => ({
                    ...p,
                    monto: Number(p.monto),
                    propina: Number(p.propina),
                    facturasVinculadas: p.facturasVinculadas.map((v: any) => ({
                        ...v,
                        monto: Number(v.monto),
                        factura: v.factura ? {
                            ...v.factura,
                            subtotal: Number(v.factura.subtotal),
                            iva: Number(v.factura.iva),
                            ish: Number(v.factura.ish),
                            total: Number(v.factura.total),
                        } : null
                    })),
                    folioIndividual: p.facturasVinculadas?.[0]?.factura?.folio ?? null
                })),
            };
        });

        // 5. ORDENAMIENTO VISUAL
        const sortedMovements = normalizedMovements.sort((a, b) => {
            const pesoA = ORDEN_PRIORIDAD[a.area] || 99;
            const pesoB = ORDEN_PRIORIDAD[b.area] || 99;

            // Si son de la misma área, los más recientes van arriba
            if (pesoA === pesoB) {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            // De lo contrario, ordenamos por la prioridad definida
            return pesoA - pesoB;
        });

        return {
            ok: true,
            movements: sortedMovements,
            message: "Corte obtenido correctamente"
        };

    } catch (error) {
        console.error("Error en getDailyCorteMovements:", error);
        return {
            ok: false,
            movements: [],
            message: "Error al cargar auditoría del periodo"
        };
    }
};