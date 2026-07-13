import "server-only";
import { prisma } from "@/core/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

const userSummarySelect = {
  select: { id: true, name: true, email: true, image: true },
} as const;

export async function findAdminById(id: string) {
  return prisma.admin.findFirst({
    where: { id, deletedAt: null },
    include: { user: userSummarySelect },
  });
}

export async function findAdminByUserId(userId: string) {
  return prisma.admin.findFirst({
    where: { userId, deletedAt: null },
    include: { user: userSummarySelect },
  });
}

export async function countActiveAdmins() {
  return prisma.admin.count({ where: { deletedAt: null } });
}

export async function listAdmins(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
}) {
  const where: Prisma.AdminWhereInput = { deletedAt: null };

  const [items, total] = await Promise.all([
    prisma.admin.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: params.sortOrder },
      include: { user: userSummarySelect },
    }),
    prisma.admin.count({ where }),
  ]);

  return { items, total };
}

export async function createAdmin(data: Prisma.AdminCreateInput) {
  return prisma.admin.create({ data, include: { user: userSummarySelect } });
}

export async function updateAdmin(id: string, data: Prisma.AdminUpdateInput) {
  return prisma.admin.update({
    where: { id },
    data,
    include: { user: userSummarySelect },
  });
}

export async function softDeleteAdmin(id: string) {
  return prisma.admin.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
