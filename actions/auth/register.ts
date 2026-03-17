'use server';
import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import bcryptjs from 'bcryptjs';
import { revalidatePath } from "next/cache";

interface Props {
    name: string;
    email: string;
    password: string;
    role?: any;
}

export const registerUser = async ({ name, email, password, role = 'recepcionista' }: Props) => {
    const session = await auth();

    // 1. Candado de seguridad
    if (!session?.user || session.user.role !== 'admin') {
        return {
            ok: false,
            message: 'No tiene permisos de administrador para realizar esta acción'
        }
    }

    try {
        const hashedPassword = bcryptjs.hashSync(password, 10);
        const emailLower = email.toLowerCase().trim();

        // 2. Iniciamos la transacción de DB (ahora será mucho más rápida)
        const result = await prisma.$transaction(async (tx) => {

            // A. Creamos el usuario
            const newUser = await tx.user.create({
                data: {
                    name,
                    email: emailLower,
                    password: hashedPassword,
                    role: role,
                },
            });

            // B. Registro de auditoría para trazabilidad
            await tx.auditLog.create({
                data: {
                    usuarioId: session.user.id!,
                    usuarioNombre: session.user.name || 'Admin',
                    accion: 'CREATE',
                    entityName: 'User',
                    entityId: newUser.id,
                    motivo: `Registro de nuevo personal: ${newUser.name} con rol ${role}`,
                    newValues: {
                        name: newUser.name,
                        email: newUser.email,
                        role: newUser.role
                    }
                    // Jamás enviamos 'password' o 'hashedPassword' aquí.
                }
            });

            return newUser;
        });

        // 3. Notificamos a Next.js que los datos cambiaron para refrescar la lista
        revalidatePath('/admin/usuarios');

        return {
            ok: true,
            message: 'Usuario creado y registrado en auditoría',
            user: { id: result.id, name: result.name }
        };

    } catch (error: any) {
        console.error("ERROR_REGISTER_USER:", error);

        // Manejo específico de correos duplicados (P2002 es error de unicidad en Prisma)
        if (error.code === 'P2002') {
            return { ok: false, message: 'El correo electrónico ya está registrado' };
        }

        return {
            ok: false,
            message: 'Error interno: No se pudo completar el registro en la base de datos'
        };
    }
}