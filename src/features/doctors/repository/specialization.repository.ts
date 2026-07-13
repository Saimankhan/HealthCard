import "server-only";
import { prisma } from "@/core/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function findSpecializationById(id: string) {
  return prisma.specialization.findFirst({ where: { id, deletedAt: null } });
}

export async function listSpecializations(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  search?: string;
}) {
  const where: Prisma.SpecializationWhereInput = {
    deletedAt: null,
    ...(params.search
      ? { name: { contains: params.search, mode: "insensitive" } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.specialization.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { name: params.sortOrder },
    }),
    prisma.specialization.count({ where }),
  ]);

  return { items, total };
}

export async function createSpecialization(
  data: Prisma.SpecializationCreateInput
) {
  return prisma.specialization.create({ data });
}

export async function updateSpecialization(
  id: string,
  data: Prisma.SpecializationUpdateInput
) {
  return prisma.specialization.update({ where: { id }, data });
}

export async function softDeleteSpecialization(id: string) {
  return prisma.specialization.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
