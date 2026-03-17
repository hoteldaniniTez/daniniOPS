'use server';

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";

interface GetMovementsOptions {
    filtro?: 'todos' | 'pagados' | 'pendientes';
    searchTerm?: string;
    fechaInicio?: string;
    fechaFin?: string;
    page?: number;
    take?: number;
}

export const getMovementsCredits = async ({
    filtro = 'todos',
    searchTerm = '',
    fechaInicio,
    fechaFin,
    page = 1,
    take = 12,
}: GetMovementsOptions) => {

    const session = await auth()
    if (!session?.user?.id) {
        return {
            ok: false,
            movements: [],
            message: "No autorizado o sin sesión activa"
        };
    }

    if (isNaN(Number(page))) page = 1;
    if (page < 1) page = 1;

    try {
        const where: any = {
            pagos: {
                some: { metodo: 'credito_cobrar' }
            }
        };

        if (filtro === 'pagados') where.pagado = true;
        if (filtro === 'pendientes') where.pagado = false;

        // 🟢 BLINDAJE DE FECHAS: Regla de 7:00 AM a 7:00 AM en UTC-6
        if (fechaInicio || fechaFin) {
            where.createdAt = {};

            if (fechaInicio) {
                // Inicio a las 7:00 AM del día indicado, hora de México
                const start = new Date(`${fechaInicio}T07:00:00.000-06:00`);
                where.createdAt.gte = start;
            }

            if (fechaFin) {
                // Fin a las 7:00 AM del DÍA SIGUIENTE, hora de México
                const end = new Date(`${fechaFin}T07:00:00.000-06:00`);
                end.setDate(end.getDate() + 1); // Sumamos 1 día
                where.createdAt.lte = end;
            }
        }

        if (searchTerm) {
            const cleanTerm = searchTerm.trim();
            where.OR = [
                { referencia: { contains: cleanTerm, mode: 'insensitive' } },
                { nombreCliente: { contains: cleanTerm, mode: 'insensitive' } }
            ];
        }

        // Ejecutamos la cuenta total y la búsqueda en paralelo para mejorar rendimiento
        const [totalCount, movements] = await Promise.all([
            prisma.movimiento.count({ where }),
            prisma.movimiento.findMany({
                take: take,
                skip: (page - 1) * take,
                where,
                include: {
                    // 🟢 INCLUIMOS USUARIO PARA TENER EL CREADOR (Vital para la UI)
                    usuario: { select: { name: true } },
                    pagos: {
                        // Incluimos las facturas vinculadas para que el mapeo no falle
                        include: { facturasVinculadas: { include: { factura: true } } }
                    },
                    detalleHotel: true,
                    detalleRestaurante: true,
                    detalleEvento: true,
                    detalleSouvenir: true,
                },
                orderBy: { createdAt: 'desc' },
            })
        ]);

        const totalPages = Math.ceil(totalCount / take);

        // Normalización exacta a la del Corte Diario para evitar Crashes en UI
        return {
            movements: movements.map(mov => {
                const propinaTotal = mov.pagos.reduce((acc: number, p: any) => acc + Number(p.propina), 0);
                const primerPagoConFactura = mov.pagos.find((p: any) => p.facturasVinculadas?.length > 0);
                const facturaData = primerPagoConFactura?.facturasVinculadas[0]?.factura;

                return {
                    ...mov,
                    descripcion: mov.descripcion ?? undefined,
                    montoNeto: Number(mov.montoNeto),
                    propina: propinaTotal,
                    requiereFactura: mov.pagos.some((p: any) => p.requiereFactura),
                    folioFactura: facturaData?.folio ?? null,
                    estaFacturado: mov.pagos.every((p: any) => p.facturado),
                    creador: mov.usuario?.name || 'Sistema', // <-- Nombre del que otorgó el crédito

                    pagos: mov.pagos.map((p: any) => ({
                        ...p,
                        monto: Number(p.monto),
                        propina: Number(p.propina),
                        nombreFactura: p.nombreFactura ?? "",
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
            }),
            totalPages
        };
    } catch (error) {
        console.error("Error al obtener créditos:", error);
        return { movements: [], totalPages: 0 };
    }
};