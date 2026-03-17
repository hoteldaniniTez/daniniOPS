import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // datasource: {
  //   url: process.env.DATABASE_URL!,
  // },
  datasource: {
    // Esta es la conexión para las migraciones (DIRECT_URL)
    url: process.env.DIRECT_URL!,
  },
});