import "server-only";
import { PrismaClient } from "@prisma/client";

// Server-only Prisma singleton. NEVER import this from a client component or an
// edge runtime route — Golazo Markets DB access runs in the Node.js runtime.
// The global cache avoids exhausting connections during dev hot-reload.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
