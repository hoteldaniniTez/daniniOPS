"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";

export const getUsers = async () => {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            ok: false,
            users: [],
            message: "No autorizado o sin sesión activa"
        };
    }


    if (session.user.role !== "admin") {
        return {
            ok: false,
            users: [],
            message: "El usuario debe estar autenticado como administrador"
        };
    }
    try {
        const users = await prisma.user.findMany({
            orderBy: {
                name: 'asc' // Ordenados alfabéticamente
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                active: true,
                createdAt: true
                // No incluimos 'password' aquí por seguridad
            }
        });

        return { ok: true, users: users, message: "Usuarios obtenidos correctamente" };
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        return {
            ok: false,
            users: [],
            message: "Error interno al consultar la base de datos"
        }
    }
};