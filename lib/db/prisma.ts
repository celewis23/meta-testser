import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

if (process.env.VERCEL === "1" && process.env.DATABASE_PROVIDER !== "postgresql") {
  throw new Error(
    "Vercel deployments must use hosted Postgres. Set DATABASE_PROVIDER=postgresql and configure DATABASE_URL accordingly."
  );
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
