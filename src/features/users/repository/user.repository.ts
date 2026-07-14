import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/core/db/prisma";
import type { Prisma, Role } from "@/generated/prisma/client";

export async function findUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

/** Includes soft-deleted users; only for admin status-management actions. */
export async function findUserByIdIncludingDeleted(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email, deletedAt: null } });
}

export async function listUserIds(role?: Role) {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, ...(role ? { role } : {}) },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export async function listUsersForBroadcast(role?: Role) {
  return prisma.user.findMany({
    where: { deletedAt: null, suspendedAt: null, ...(role ? { role } : {}) },
    select: { id: true, email: true },
  });
}

export async function listUsers(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  role?: Role;
  search?: string;
  status?: "ACTIVE" | "SUSPENDED" | "DELETED" | "ALL";
}) {
  const statusFilter: Prisma.UserWhereInput =
    params.status === "DELETED"
      ? { deletedAt: { not: null } }
      : params.status === "SUSPENDED"
        ? { deletedAt: null, suspendedAt: { not: null } }
        : params.status === "ALL"
          ? {}
          : { deletedAt: null };

  const where: Prisma.UserWhereInput = {
    ...statusFilter,
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

export async function restoreUser(id: string) {
  return prisma.user.update({ where: { id }, data: { deletedAt: null } });
}

export async function suspendUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { suspendedAt: new Date() },
  });
}

export async function unsuspendUser(id: string) {
  return prisma.user.update({ where: { id }, data: { suspendedAt: null } });
}

export async function createUserWithPassword(input: {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: input.id,
        name: input.name,
        email: input.email,
        emailVerified: true,
        role: input.role,
      },
    });
    await tx.account.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        providerId: "credential",
        accountId: user.id,
        password: input.passwordHash,
      },
    });
    return user;
  });
}
