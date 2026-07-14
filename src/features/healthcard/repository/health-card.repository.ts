import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/core/db/prisma";
import type { HealthCardStatus, Prisma } from "@/generated/prisma/client";

const patientUserInclude = {
  patient: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

function generateCardNumber(): string {
  return `HC-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function findHealthCardById(id: string) {
  return prisma.healthCard.findFirst({
    where: { id, deletedAt: null },
    include: patientUserInclude,
  });
}

export async function findHealthCardByPatientId(patientId: string) {
  return prisma.healthCard.findFirst({
    where: { patientId, deletedAt: null },
    include: patientUserInclude,
  });
}

export async function findHealthCardByToken(token: string) {
  return prisma.healthCard.findFirst({
    where: { verificationToken: token, deletedAt: null },
    include: patientUserInclude,
  });
}

export async function listHealthCards(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  status?: HealthCardStatus;
}) {
  const where: Prisma.HealthCardWhereInput = {
    deletedAt: null,
    ...(params.status ? { status: params.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.healthCard.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { issuedAt: params.sortOrder },
      include: patientUserInclude,
    }),
    prisma.healthCard.count({ where }),
  ]);

  return { items, total };
}

export async function createHealthCard(patientId: string, expiresAt?: Date) {
  return prisma.healthCard.create({
    data: {
      patientId,
      cardNumber: generateCardNumber(),
      verificationToken: randomUUID(),
      expiresAt:
        expiresAt ??
        new Date(new Date().setFullYear(new Date().getFullYear() + 3)),
    },
    include: patientUserInclude,
  });
}

export async function updateHealthCardStatus(
  id: string,
  status: HealthCardStatus
) {
  return prisma.healthCard.update({
    where: { id },
    data: { status },
    include: patientUserInclude,
  });
}

export async function reissueHealthCard(
  id: string,
  opts?: { newCardNumber?: boolean; expiresAt?: Date }
) {
  return prisma.healthCard.update({
    where: { id },
    data: {
      verificationToken: randomUUID(),
      status: "ACTIVE",
      ...(opts?.newCardNumber ? { cardNumber: generateCardNumber() } : {}),
      ...(opts?.expiresAt ? { expiresAt: opts.expiresAt } : {}),
    },
    include: patientUserInclude,
  });
}
