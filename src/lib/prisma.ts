import { PrismaClient } from "@prisma/client";

export { Prisma } from "@prisma/client";

/**
 * Single Prisma client for the whole server runtime.
 *
 * Next.js dev-mode hot reload re-evaluates modules, which would otherwise open
 * a new connection pool on every edit until Postgres refuses connections.
 * Stashing the instance on globalThis keeps exactly one pool alive.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** True when running against PostgreSQL — gates raw-SQL-only code paths. */
export function isPostgres() {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgres") || url.startsWith("postgresql");
}

/** Dialect label for logging and the admin platform screen. */
export function dialect() {
  return isPostgres() ? ("postgresql" as const) : ("sqlite" as const);
}