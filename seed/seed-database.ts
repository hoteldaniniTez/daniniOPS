import "dotenv/config";
import prisma from "../lib/prisma";
import { initialData } from "./seed";
import { AreaType } from "../lib/generated/prisma/enums";

async function main() {
    const { users, movimientosEjemplo } = initialData;

    await prisma.$transaction(async (tx) => {
        // 1️⃣ Limpieza (orden correcto por FK)
        // Borramos primero lo que depende de Movimiento
        await tx.facturaDetallePago.deleteMany();
        await tx.factura.deleteMany();
        await tx.pago.deleteMany();
        await tx.detalleHotel.deleteMany();
        await tx.detalleRestaurante.deleteMany();
        await tx.detalleEvento.deleteMany();
        await tx.detalleSouvenir.deleteMany();
        await tx.auditLog.deleteMany();

        // AHORA: Borramos Movimientos (que dependen de User y Factura)
        await tx.movimiento.deleteMany();

        // FINALMENTE: Borramos los Usuarios
        await tx.user.deleteMany();

        // 2️⃣ Crear usuarios
        // Nota: createMany no devuelve los objetos creados en todas las DBs, 
        // pero como necesitamos el ID para las relaciones, los crearemos uno por uno o buscaremos al admin después.
        for (const user of users) {
            await tx.user.create({ data: user });
        }

        // const admin = await tx.user.findFirst({
        //     where: { role: "admin" },
        //     select: { id: true },
        // });

        // if (!admin) {
        //     throw new Error("No existe usuario admin en initialData");
        // }

        // // 3️⃣ Crear movimientos
        // for (const { detalle, pagos, ...movData } of movimientosEjemplo) {
        //     await tx.movimiento.create({
        //         data: {
        //             ...movData,
        //             usuario: { connect: { id: admin.id } },

        //             // Crear detalle dinámicamente según área
        //             ...(movData.area === AreaType.HOTEL || movData.area === AreaType.ANTICIPO_HOTEL ? {
        //                 detalleHotel: { create: detalle },
        //             } : {}),

        //             ...(movData.area === AreaType.RESTAURANTE || movData.area === AreaType.ANTICIPO_RESTAURANTE ? {
        //                 detalleRestaurante: { create: detalle },
        //             } : {}),

        //             ...(movData.area === AreaType.SOUVENIR && {
        //                 detalleSouvenir: { create: detalle },
        //             }),

        //             ...(movData.area === AreaType.EVENTO || movData.area === AreaType.RENTA_ESPACIOS ? {
        //                 detalleEvento: { create: detalle },
        //             } : {}),

        //             // Crear pagos vinculados correctamente
        //             pagos: {
        //                 create: pagos.map((p) => ({
        //                     monto: p.monto,
        //                     metodo: p.metodo,
        //                     numTerminal: p.numTerminal,
        //                     tipoTarjeta: p.tipoTarjeta,
        //                     referencia: p.referencia,
        //                     cajero: { connect: { id: admin.id } },
        //                 })),
        //             },
        //         },
        //     });
        // }
    });

    console.log("Seed ejecutado correctamente");
}

main()
    .catch((e) => {
        console.error("Error ejecutando seed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });