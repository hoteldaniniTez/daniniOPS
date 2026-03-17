'use server';

import { auth } from "@/auth.config";
import { AuditAction } from "@/lib/generated/prisma/enums"; // Importar AuditAction
import prisma from "@/lib/prisma";
import bcryptjs from 'bcryptjs';
import { revalidatePath } from "next/cache";

export const updateUserAdmin = async (userId: string, data: { role?: string, password?: string, active?: boolean }) => {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            ok: false,
            message: "No autorizado o sin sesión activa"
        };
    }


    if (session.user.role !== "admin") {
        return {
            ok: false,
            message: "El usuario debe estar autenticado como administrador"
        };
    }

    try {
        const oldUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!oldUser) return { ok: false, message: 'Usuario no encontrado' };

        const updateData: any = {};
        let motivo = `Actualización de usuario ${oldUser.name}: `;
        let hasChanges = false;

        if (data.role && data.role !== oldUser.role) {
            updateData.role = data.role;
            motivo += `Cambio de rol (${oldUser.role} -> ${data.role}). `;
            hasChanges = true;
        }

        if (data.password) {
            const isSamePassword = bcryptjs.compareSync(data.password, oldUser.password);
            if (isSamePassword) return { ok: false, message: 'La nueva contraseña no puede ser igual a la anterior' };
            updateData.password = bcryptjs.hashSync(data.password, 10);
            motivo += `Restablecimiento de contraseña. `;
            hasChanges = true;
        }

        if (data.active !== undefined && data.active !== oldUser.active) {
            updateData.active = data.active;
            motivo += data.active ? "Usuario Reactivado. " : "Usuario Desactivado (Baja laboral). ";
            hasChanges = true;
        }

        if (!hasChanges) return { ok: false, message: 'No se detectaron cambios' };

        await prisma.$transaction(async (tx) => {
            // 1. Ejecutamos la actualización
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: updateData,
            });

            // 🟢 2. SANITIZACIÓN DE SEGURIDAD (Quitamos el password de los objetos)
            const { password: oldPassword, ...safeOldUser } = oldUser;
            const { password: newPassword, ...safeNewUser } = updatedUser;

            // Agregamos un indicador visual por si cambió la contraseña
            if (data.password) {
                (safeNewUser as any)._notaSeguridad = "Contraseña reestablecida por Admin";
            }

            // 3. Guardamos el log con los objetos seguros
            await tx.auditLog.create({
                data: {
                    usuarioId: session.user.id,
                    usuarioNombre: session.user.name || 'Admin',
                    accion: AuditAction.UPDATE,
                    entityName: 'User',
                    entityId: userId,
                    motivo: motivo.trim(),
                    oldValues: JSON.parse(JSON.stringify(safeOldUser)),
                    newValues: JSON.parse(JSON.stringify(safeNewUser))
                }
            });
        });

        revalidatePath('/admin/usuarios');
        return { ok: true, message: 'Estado actualizado correctamente' };

    } catch (error) {
        console.error(error);
        return { ok: false, message: 'Error al actualizar el usuario' };
    }
};