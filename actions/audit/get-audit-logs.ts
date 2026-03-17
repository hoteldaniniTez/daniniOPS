'use server';

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import { AuditAction } from "@/lib/generated/prisma/enums";

// 1. LISTA RÁPIDA (Optimizada para Neon)
export async function getAuditLogs(filtros: { fechaInicio: string; fechaFin: string; accion?: string }) {
    const session = await auth();
    if (session?.user?.role !== 'admin') return { ok: false, message: "No autorizado" };

    try {
        const inicio = new Date(`${filtros.fechaInicio}T07:00:00.000-06:00`);
        const fin = new Date(`${filtros.fechaFin}T07:00:00.000-06:00`);
        fin.setDate(fin.getDate() + 1); // Cerramos el ciclo a las 7 AM del día siguiente

        const logs = await prisma.auditLog.findMany({
            where: {
                createdAt: { gte: inicio, lte: fin },
                ...(filtros.accion !== "TODAS" && { accion: filtros.accion as AuditAction })
            },
            select: { // 🚀 CLAVE: Excluimos los JSON pesados de la lista inicial
                id: true,
                createdAt: true,
                usuarioNombre: true,
                accion: true,
                entityName: true,
                entityId: true,
                motivo: true
            },
            orderBy: { createdAt: 'desc' },
            take: 300 // Límite de seguridad
        });

        return { ok: true, data: logs };
    } catch (e) { return { ok: false, message: "Error en DB" }; }
}

// 2. DETALLE PESADO (Cargado solo al abrir el Drawer)
export async function getAuditLogDetail(logId: string) {
    const session = await auth();
    if (session?.user?.role !== 'admin') return { ok: false };

    try {
        const detail = await prisma.auditLog.findUnique({
            where: { id: logId },
            select: { oldValues: true, newValues: true }
        });
        return { ok: true, detail };
    } catch (e) { return { ok: false }; }
}