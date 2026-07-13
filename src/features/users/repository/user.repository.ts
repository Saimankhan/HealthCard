import "server-only";
import { prisma } from "@/core/db/prisma";
import type { Prisma, Role } from "@/generated/prisma/client";

export async function findUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email, deletedAt: null } });
}

export async function listUsers(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  role?: Role;
  search?: string;
}) {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(params.role ? { role: params.role } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" } },
            { email: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: params.sortOrder },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
}

export async function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data });
}

export async function softDeleteUser(id: string) {
  return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
}
