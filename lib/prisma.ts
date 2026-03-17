import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

// const pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
// });

// const adapter = new PrismaPg(pool);

// const prismaClientSingleton = () => {
//     return new PrismaClient({
//         adapter,
//         log: ['query', 'info', 'warn', 'error'],
//     });
// };

// type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// const globalForPrisma = globalThis as unknown as {
//     prisma: PrismaClientSingleton | undefined;
// };

// const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// export default prisma;

// if (process.env.NODE_ENV !== "production") {
//     globalForPrisma.prisma = prisma;
// }

// Usamos el DATABASE_URL con pooler
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString,
    // CRÍTICO: Neon requiere SSL para conexiones seguras
    ssl: true
});

const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
    return new PrismaClient({
        adapter,
        // Logs: En desarrollo vemos todo, en producción solo errores
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
};

// Configuración del Singleton para evitar duplicar conexiones en Next.js
declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") {
    globalThis.prismaGlobal = prisma;
}
