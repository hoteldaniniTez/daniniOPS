import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import z from "zod";
import prisma from "./lib/prisma";
import bcryptjs from "bcryptjs";

const authenticatedRoutes: string[] = [
  '/admin',
  '/admin/auditoria',
  '/admin/propinas',
  '/admin/reportes',
  '/admin/usuarios',
  '/perfil',
  '/recepcion',
  '/recepcion/creditos-por-cobrar',
  '/recepcion/movimientos',
];

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/auth/login',
    newUser: '/admin/usuarios'
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = authenticatedRoutes.includes(nextUrl.pathname);
      // console.log({ isLoggedIn, isOnDashboard });
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return true;//Response.redirect(new URL('/', nextUrl));
      }
      return true;
    },

    jwt({ token, user }) {
      // console.log({ token, user });
      if (user) {
        token.data = user;
      }
      return token;
    },

    session({ session, token, user }) {
      // console.log({ session, token, user });
      session.user = token.data as any;
      return session;
    }
  },
  providers: [
    Credentials({
      async authorize(credentials) {

        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsedCredentials.success) return null;
        const { email, password } = parsedCredentials.data;

        // Buscar el correo
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) return null;

        // Verificar si el usuario esta activo
        if (!user.active) {
          console.log(`Intento de acceso bloqueado para usuario desactivado: ${email}`);
          return null;
        }

        // Comparar las contraseñas
        if (!bcryptjs.compareSync(password, user.password)) return null;

        // Regresar el usuario sin el password
        const { password: _, ...rest } = user;
        return rest;
      },
    }),
  ],
}

export const { signIn, signOut, auth, handlers } = NextAuth(authConfig);