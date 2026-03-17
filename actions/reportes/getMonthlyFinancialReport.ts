'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import { AreaType, MetodoPago, TerminalTipo } from "@/lib/generated/prisma/enums";

export async function getMonthlyFinancialReport(params: {
    mesInicio: string; // Formato "YYYY-MM" (ej. "2026-01")
    mesFin: string;    // Formato "YYYY-MM"
    area: string;      // "TODAS", "HOTEL", "RESTAURANTE", etc.
}) {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false, data: null, message: "No autorizado o sin sesión activa" };
    }

    const rolesPermitidos = ["admin", "auxiliar_admin"];
    if (!rolesPermitidos.includes(session.user.role)) {
        return { ok: false, data: null, message: "Acceso denegado" };
    }

    try {
        const [anioIni, mesIni] = params.mesInicio.split('-');
        const [anioFin, mesFin] = params.mesFin.split('-');

        // 🟢 1. CÁLCULO BLINDADO DE FECHAS (UTC-6 y Regla de 7:00 AM)

        // Inicio: Día 1 del mes a las 7:00 AM (Hora de México)
        const inicio = new Date(`${anioIni}-${mesIni}-01T07:00:00.000-06:00`);

        // Para el fin de mes, necesitamos saber cuántos días tiene el mes final
        const diasDelMesFin = new Date(Number(anioFin), Number(mesFin), 0).getDate();

        // Fin: Día 1 DEL SIGUIENTE MES a las 7:00 AM
        // Primero nos ubicamos en el último día del mes a las 7 AM...
        const fin = new Date(`${anioFin}-${mesFin}-${diasDelMesFin}T07:00:00.000-06:00`);
        // ... y le sumamos 1 día para cerrar exactamente a las 7:00 AM del primer día del próximo mes
        fin.setDate(fin.getDate() + 1);

        // 2. FILTRO EN BASE DE DATOS
        const whereClause: any = {
            fechaPago: { gte: inicio, lte: fin }, // Ahora busca de 7 AM a 7 AM
            metodo: {
                notIn: [MetodoPago.credito_cobrar, MetodoPago.cupon]
            }
        };

        if (params.area !== "TODAS") {
            if (params.area === "HOTEL") {
                whereClause.movimiento = { area: { in: [AreaType.HOTEL, AreaType.ANTICIPO_HOTEL] } };
            } else if (params.area === "RESTAURANTE") {
                whereClause.movimiento = { area: { in: [AreaType.RESTAURANTE, AreaType.ANTICIPO_RESTAURANTE] } };
            } else {
                whereClause.movimiento = { area: params.area };
            }
        }

        const pagos = await prisma.pago.findMany({
            where: whereClause,
            include: { movimiento: true }
        });

        // 3. MAPA DE DÍAS OPERATIVOS
        const reporteMap = new Map();

        // Iteramos desde el día 1 hasta el último día del mes
        for (let i = 1; i <= diasDelMesFin; i++) {
            // Creamos la llave en formato YYYY-MM-DD
            const diaStr = i.toString().padStart(2, '0');
            // Usamos el mesFin y anioFin para la estructura (asumiendo que buscan un solo mes a la vez, 
            // o si es rango, iteramos correctamente). Para hacerlo a prueba de balas sobre rangos:
            const currentDate = new Date(inicio);
            currentDate.setDate(inicio.getDate() + (i - 1));

            const dateKey = currentDate.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

            reporteMap.set(dateKey, {
                fecha: dateKey,
                efectivo: 0, p_deposito: 0, transferencia: 0,
                T_4303851: 0, T_4449999: 0, cortesia_h: 0, cortesia_r: 0,
                credito_familiar: 0, propinas: 0, TOTAL: 0
            });
        }

        // ... El resto de inicializaciones
        const totalesRango = {
            efectivo: 0, p_deposito: 0, transferencia: 0,
            T_4303851: 0, T_4449999: 0, cortesia_h: 0, cortesia_r: 0,
            credito_familiar: 0, propinas: 0, TOTAL: 0
        };

        const metodosValidos: MetodoPago[] = [
            MetodoPago.efectivo, MetodoPago.transferencia, MetodoPago.tarjeta,
            MetodoPago.p_deposito, MetodoPago.credito_familiar,
            MetodoPago.cortesia_r, MetodoPago.cortesia_h
        ];

        // 4. DISTRIBUCIÓN DE PAGOS EN SUS DÍAS CORRESPONDIENTES
        pagos.forEach(p => {
            // 🟢 CRÍTICO: ¿A qué "Día Operativo" pertenece este pago?
            // Si el pago se hizo a las 2:00 AM del 5 de Marzo, pertenece al 4 de Marzo.
            const fechaOperativa = new Date(p.fechaPago);
            // Convertimos la hora del pago a la hora de México para evaluarla
            const horaMexico = Number(fechaOperativa.toLocaleTimeString("en-US", { timeZone: "America/Mexico_City", hour12: false }).split(':')[0]);

            // Si el pago ocurrió entre la medianoche y las 6:59 AM, le restamos un día para que caiga en la llave correcta
            if (horaMexico < 7) {
                fechaOperativa.setDate(fechaOperativa.getDate() - 1);
            }

            const dateKey = fechaOperativa.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

            const diaRef = reporteMap.get(dateKey);
            if (!diaRef) return; // Si por alguna razón cae fuera del mapa, lo ignoramos

            const metodo = p.metodo;
            if (!metodosValidos.includes(metodo)) return;

            const propina = Number(p.propina || 0);
            const montoTotalParaSumar = Number(p.monto) + propina;

            diaRef.propinas += propina;
            totalesRango.propinas += propina;

            if (metodo === MetodoPago.tarjeta && p.numTerminal) {
                if (p.numTerminal === TerminalTipo.T_4303851) {
                    diaRef.T_4303851 += montoTotalParaSumar; totalesRango.T_4303851 += montoTotalParaSumar;
                } else if (p.numTerminal === TerminalTipo.T_4449999) {
                    diaRef.T_4449999 += montoTotalParaSumar; totalesRango.T_4449999 += montoTotalParaSumar;
                }
            } else if (metodo === MetodoPago.efectivo) {
                diaRef.efectivo += montoTotalParaSumar; totalesRango.efectivo += montoTotalParaSumar;
            } else if (metodo === MetodoPago.p_deposito) {
                diaRef.p_deposito += montoTotalParaSumar; totalesRango.p_deposito += montoTotalParaSumar;
            } else if (metodo === MetodoPago.transferencia) {
                diaRef.transferencia += montoTotalParaSumar; totalesRango.transferencia += montoTotalParaSumar;
            } else if (metodo === MetodoPago.cortesia_h) {
                diaRef.cortesia_h += montoTotalParaSumar; totalesRango.cortesia_h += montoTotalParaSumar;
            } else if (metodo === MetodoPago.cortesia_r) {
                diaRef.cortesia_r += montoTotalParaSumar; totalesRango.cortesia_r += montoTotalParaSumar;
            } else if (metodo === MetodoPago.credito_familiar) {
                diaRef.credito_familiar += montoTotalParaSumar; totalesRango.credito_familiar += montoTotalParaSumar;
            }

            diaRef.TOTAL += montoTotalParaSumar;
            totalesRango.TOTAL += montoTotalParaSumar;
        });

        // Convertimos el mapa en array para el Frontend
        const reportePorDia = Array.from(reporteMap.values());

        return {
            ok: true,
            data: { reportePorDia, totalesRango }
        };

    } catch (error) {
        console.error("Error al generar reporte de rango:", error);
        return { ok: false, data: null, message: "Error interno" };
    }
}