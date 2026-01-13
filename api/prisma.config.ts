import 'dotenv/config'
import path from "node:path";
import { defineConfig, env } from "@prisma/config";

// Durante o build (prisma generate), a DATABASE_URL pode não estar disponível
// O prisma generate não precisa de uma conexão real, apenas do schema
// A URL real será usada em runtime quando a variável estiver disponível
const databaseUrl = process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy?schema=public";

console.log('🔌 [Prisma Config] DATABASE_URL configurada:', databaseUrl.replace(/:[^:@]+@/, ':***@'));

export default defineConfig({
    schema: path.join("prisma", "schema.prisma"),
    migrations: {
        path: "./prisma/migrations",
        seed: "node prisma/seed.js",
    },
    datasource: {
        // Usa DATABASE_URL direto do ambiente
        url: databaseUrl,
    },
});
