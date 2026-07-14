import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/core/config/env.server";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: serverEnv.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: serverEnv.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (serverEnv.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
