'use server';

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";

export const getPropinasReport = async ({
    mesero = 'todos',
    fechaInicio,
    fechaFin,
    page = 1,
    take = 12
}: {
    mesero?: string,
    fechaInicio?: string,
    fechaFin?: string,
    page?: number,
    take?: number
} = {}) => {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, message: "No autorizado", movements: [], totalPages: 0, granTotalPeriodo: 0 };

    const rolesPermitidos = ["admin", "auxiliar_admin"];
    if (!rolesPermitidos.includes(session.user.role)) return { ok: false, message: "Permisos insuficientes", movements: [], totalPages: 0, granTotalPeriodo: 0 };

    try {
        const where: any = {
            area: 'RESTAURANTE',
            pagos: { some: { propina: { gt: 0 } } }
        };

        if (mesero !== 'todos') {
            where.detalleRestaurante = { mesero: mesero };
        }

        if (fechaInicio || fechaFin) {
            where.createdAt = {};

            if (fechaInicio) {
                where.createdAt.gte = new Date(`${fechaInicio}T07:00:00.000-06:00`);
            }

            if (fechaFin) {
                const endDate = new Date(`${fechaFin}T07:00:00.000-06:00`);
                endDate.setDate(endDate.getDate() + 1); // Cerramos el ciclo a las 7AM del día siguiente
                where.createdAt.lte = endDate;
            }
        }

        // 🚀 Consultas en paralelo para optimizar Neon DB
        const [totalCount, movements, aggregateResult] = await Promise.all([
            prisma.movimiento.count({ where }),
            prisma.movimiento.findMany({
                where,
                take: take,
                skip: (page - 1) * take,
                include: {
                    detalleRestaurante: true,
                    pagos: { where: { propina: { gt: 0 } } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.pago.aggregate({
                where: {
                    propina: { gt: 0 },
                    movimiento: where
                },
                _sum: { propina: true }
            })
        ]);

        const totalPages = Math.ceil(totalCount / take);
        const granTotalPeriodo = Number(aggregateResult._sum.propina || 0);

        // 🟢 LIMPIEZA DE OBJETOS: Convertimos Decimal a Number y Date a String
        // Esto elimina el error "Decimal objects are not supported"
        const plainMovements = movements.map(mov => {
            const totalPropinaMovimiento = mov.pagos.reduce((acc, pago) => acc + Number(pago.propina || 0), 0);

            return {
                ...mov,
                createdAt: mov.createdAt.toISOString(), // Convertimos Date a String
                montoNeto: Number(mov.montoNeto),        // Convertimos Decimal a Number
                propina: totalPropinaMovimiento,
                pagos: mov.pagos.map(p => ({
                    ...p,
                    fechaPago: p.fechaPago.toISOString(),
                    monto: Number(p.monto),
                    propina: Number(p.propina)
                }))
            };
        });

        return {
            ok: true,
            movements: plainMovements,
            totalPages,
            granTotalPeriodo,
            message: "Propinas obtenidas correctamente"
        };
    } catch (error) {
        console.error(error);
        return { ok: false, message: "Error de servidor", movements: [], totalPages: 0, granTotalPeriodo: 0 };
    }
};