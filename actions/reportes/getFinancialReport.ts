'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import { AreaType, MetodoPago, TerminalTipo } from "@/lib/generated/prisma/enums";

export async function getFinancialReport(params: {
    fechaInicio: string;
    fechaFin: string;
}) {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            ok: false,
            data: null,
            message: "No autorizado o sin sesión activa"
        };
    }

    const rolesPermitidos = ["admin", "auxiliar_admin"];

    if (!rolesPermitidos.includes(session.user.role)) {
        return {
            ok: false,
            data: null,
            message: "El usuario debe estar autenticado como administrador o como auxiliar administrativo"
        };
    }

    try {
        // 🟢 1. CÁLCULO BLINDADO DE FECHAS (UTC-6 y Regla de 7:00 AM a 7:00 AM)
        const inicio = new Date(`${params.fechaInicio}T07:00:00.000-06:00`);

        const fin = new Date(`${params.fechaFin}T07:00:00.000-06:00`);
        fin.setDate(fin.getDate() + 1); // 7:00 AM del día siguiente

        // 1. Consulta de Pagos con exclusión desde la Base de Datos
        const pagos = await prisma.pago.findMany({
            where: {
                fechaPago: { gte: inicio, lte: fin }, // Usamos las fechas corregidas
                metodo: {
                    notIn: [MetodoPago.credito_cobrar, MetodoPago.cupon]
                }
            },
            include: { movimiento: true }
        });

        // 2. Consulta de Facturas (Que crucen con pagos hechos en este turno)
        const facturas = await prisma.factura.findMany({
            where: {
                detallesPago: {
                    some: {
                        pago: {
                            fechaPago: { gte: inicio, lte: fin }
                        }
                    }
                }
            },
            orderBy: { folio: 'asc' }
        });


        // 3. Inicialización de la Matriz de Ingresos
        const matrizIngresos: Record<string, any> = {};
        Object.values(AreaType).forEach(area => {
            matrizIngresos[area] = {
                efectivo: 0,
                p_deposito: 0,
                transferencia: 0,
                tarjeta: {
                    terminal: {
                        [TerminalTipo.T_4303851]: 0,
                        [TerminalTipo.T_4449999]: 0
                    }
                },
                cortesia_h: 0,
                cortesia_r: 0,
                credito_familiar: 0,
                totalPropinas: 0,
                TOTAL: 0
            };
        });

        let granTotal = 0;
        let totalGeneralPropinas = 0;

        const totalesPorMetodo: Record<string, number> = {
            efectivo: 0,
            p_deposito: 0,
            transferencia: 0,
            T_4303851: 0,
            T_4449999: 0,
            cortesia_h: 0,
            cortesia_r: 0,
            credito_familiar: 0
        };

        // 🟢 4. EL CANDADO: Lista blanca estricta con tipado de TypeScript
        const metodosValidos: MetodoPago[] = [
            MetodoPago.efectivo,
            MetodoPago.transferencia,
            MetodoPago.tarjeta,
            MetodoPago.p_deposito,
            MetodoPago.credito_familiar,
            MetodoPago.cortesia_r,
            MetodoPago.cortesia_h
        ];

        // 5. Procesamiento y suma por área y método
        pagos.forEach(p => {
            const area = p.movimiento.area;
            const metodo = p.metodo;

            // 🟢 GATEKEEPER: Si el método es credito_cobrar, cupon o cualquier otro no válido, se ignora por completo.
            if (!metodosValidos.includes(metodo)) return;

            const propina = Number(p.propina || 0);
            const montoBruto = Number(p.monto) + propina;

            const ref = matrizIngresos[area];
            if (!ref) return;

            // Acumular propinas
            ref.totalPropinas += propina;
            totalGeneralPropinas += propina;

            // Suma por método específico
            if (metodo === MetodoPago.tarjeta && p.numTerminal) {
                if (ref.tarjeta.terminal[p.numTerminal] !== undefined) {
                    ref.tarjeta.terminal[p.numTerminal] += montoBruto;
                }
                if (totalesPorMetodo[p.numTerminal] !== undefined) {
                    totalesPorMetodo[p.numTerminal] += montoBruto;
                }
            } else if (metodo === MetodoPago.efectivo) {
                ref.efectivo += montoBruto;
                totalesPorMetodo.efectivo += montoBruto;
            } else if (metodo === MetodoPago.p_deposito) {
                ref.p_deposito += montoBruto;
                totalesPorMetodo.p_deposito += montoBruto;
            } else if (metodo === MetodoPago.transferencia) {
                ref.transferencia += montoBruto;
                totalesPorMetodo.transferencia += montoBruto;
            } else if (metodo === MetodoPago.cortesia_h) {
                ref.cortesia_h += montoBruto;
                totalesPorMetodo.cortesia_h += montoBruto;
            } else if (metodo === MetodoPago.cortesia_r) {
                ref.cortesia_r += montoBruto;
                totalesPorMetodo.cortesia_r += montoBruto;
            } else if (metodo === MetodoPago.credito_familiar) {
                ref.credito_familiar += montoBruto;
                totalesPorMetodo.credito_familiar += montoBruto;
            }

            // Suma a los totales generales (100% segura gracias al Gatekeeper)
            ref.TOTAL += montoBruto;
            granTotal += montoBruto;
        });

        // 6. Procesamiento y resumen de facturas para el cuadre fiscal
        const resumenFiscal = {
            subtotalHotel: 0,
            subtotalRestaurante: 0,
            subtotalOtros: 0,
            iva: 0,
            ish: 0,
            totalFacturado: 0
        };

        const facturasDetalle = facturas.map(f => {
            const subtotalNum = Number(f.subtotal);
            const ivaNum = Number(f.iva);
            const ishNum = Number(f.ish);
            const totalNum = Number(f.total);

            if (f.area === AreaType.HOTEL || f.area === AreaType.ANTICIPO_HOTEL) {
                resumenFiscal.subtotalHotel += subtotalNum;
            } else if (f.area === AreaType.RESTAURANTE || f.area === AreaType.ANTICIPO_RESTAURANTE) {
                resumenFiscal.subtotalRestaurante += subtotalNum;
            } else {
                resumenFiscal.subtotalOtros += subtotalNum;
            }
            resumenFiscal.iva += ivaNum;
            resumenFiscal.ish += ishNum;
            resumenFiscal.totalFacturado += totalNum;

            return {
                ...f,
                subtotal: subtotalNum,
                iva: ivaNum,
                ish: ishNum,
                total: totalNum,
            };
        });

        return {
            ok: true,
            data: {
                matrizIngresos,
                totalesPorMetodo,
                facturasDetalle,
                granTotal,
                totalGeneralPropinas,
                resumenFiscal
            }
        };

    } catch (error) {
        console.error("Error al generar el reporte financiero:", error);
        return { ok: false, data: null, message: "Error interno al procesar reporte" };
    }
}