import "server-only";
import { prisma } from "@/core/db/prisma";
import type { AuditAction, Prisma } from "@/generated/prisma/client";

export async function createAuditLog(input: {
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export async function listAuditLogs(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  entityType?: string;
  actorId?: string;
}) {
  const where: Prisma.AuditLogWhereInput = {
    ...(params.entityType ? { entityType: params.entityType } : {}),
    ...(params.actorId ? { actorId: params.actorId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: params.sortOrder },
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total };
}
