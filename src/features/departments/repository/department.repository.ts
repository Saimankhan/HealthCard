import "server-only";
import { prisma } from "@/core/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function findDepartmentById(id: string) {
  return prisma.department.findFirst({ where: { id, deletedAt: null } });
}

export async function listDepartments(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  search?: string;
}) {
  const where: Prisma.DepartmentWhereInput = {
    deletedAt: null,
    ...(params.search
      ? { name: { contains: params.search, mode: "insensitive" } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.department.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { name: params.sortOrder },
    }),
    prisma.department.count({ where }),
  ]);

  return { items, total };
}

export async function createDepartment(data: Prisma.DepartmentCreateInput) {
  return prisma.department.create({ data });
}

export async function updateDepartment(
  id: string,
  data: Prisma.DepartmentUpdateInput
) {
  return prisma.department.update({ where: { id }, data });
}

export async function softDeleteDepartment(id: string) {
  return prisma.department.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
