import { defineConfig } from "prisma/config";

export default defineConfig({
  // the main entry for your schema
  schema: "prisma/schema.prisma",

  // where migrations should be generated
  // what script to run for "prisma db seed"
  migrations: {
    path: "prisma/migrations",
    seed: "bun run prisma/seed.ts",
  },

  // The database URL (직접 process.env 사용 - Docker 환경 변수 호환)
  datasource: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:password@localhost:5432/gateway?schema=public",
  },
});
