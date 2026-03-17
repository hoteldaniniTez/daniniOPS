'use server';
import { signIn } from '@/auth.config';
import { AuthError } from 'next-auth'; // Importante para manejar errores específicos

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        // Usamos Object.fromEntries para obtener email y password
        const data = Object.fromEntries(formData);

        await signIn('credentials', {
            ...data,
            redirect: false, // Mantenemos false porque usamos el retorno para la UI
        });

        return 'Success';

    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'CredentialsSignin';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error; // Re-lanzar para que Next.js maneje otros errores
    }
}

// 🟢 Versión corregida para componentes que no usan useFormState
export const login = async (email: string, password: string) => {
    try {
        await signIn('credentials', {
            email,
            password,
            redirect: true, // 👈 Si quieres que lo mande al home auto, déjalo en true
            redirectTo: '/recepcion/movimientos' // Opcional: a donde mandarlo
        });

        return { ok: true };
    } catch (error) {
        // 🟢 CRÍTICO: Si es un error de redirección, NextAuth lo maneja solo, 
        // no debemos retornar "ok: false"
        if ((error as any).message === 'NEXT_REDIRECT') {
            throw error;
        }

        return {
            ok: false,
            message: 'Credenciales incorrectas.',
        };
    }
}