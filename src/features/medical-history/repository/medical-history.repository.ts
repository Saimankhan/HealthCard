import "server-only";
import { prisma } from "@/core/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

const medicalHistoryInclude = {
  patient: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  doctor: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

export async function findMedicalHistoryById(id: string) {
  return prisma.medicalHistory.findFirst({
    where: { id, deletedAt: null },
    include: medicalHistoryInclude,
  });
}

export async function listMedicalHistory(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  patientId?: string;
  doctorId?: string;
}) {
  const where: Prisma.MedicalHistoryWhereInput = {
    deletedAt: null,
    ...(params.patientId ? { patientId: params.patientId } : {}),
    ...(params.doctorId ? { doctorId: params.doctorId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.medicalHistory.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { recordedAt: params.sortOrder },
      include: medicalHistoryInclude,
    }),
    prisma.medicalHistory.count({ where }),
  ]);

  return { items, total };
}

export async function createMedicalHistory(
  data: Prisma.MedicalHistoryCreateInput
) {
  return prisma.medicalHistory.create({
    data,
    include: medicalHistoryInclude,
  });
}

export async function updateMedicalHistory(
  id: string,
  data: Prisma.MedicalHistoryUpdateInput
) {
  return prisma.medicalHistory.update({
    where: { id },
    data,
    include: medicalHistoryInclude,
  });
}

export async function softDeleteMedicalHistory(id: string) {
  return prisma.medicalHistory.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
