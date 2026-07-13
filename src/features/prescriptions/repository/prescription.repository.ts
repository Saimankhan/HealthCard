import "server-only";
import { prisma } from "@/core/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

const prescriptionInclude = {
  patient: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  doctor: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

export async function findPrescriptionById(id: string) {
  return prisma.prescription.findFirst({
    where: { id, deletedAt: null },
    include: prescriptionInclude,
  });
}

export async function listPrescriptions(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  patientId?: string;
  doctorId?: string;
}) {
  const where: Prisma.PrescriptionWhereInput = {
    deletedAt: null,
    ...(params.patientId ? { patientId: params.patientId } : {}),
    ...(params.doctorId ? { doctorId: params.doctorId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { issuedAt: params.sortOrder },
      include: prescriptionInclude,
    }),
    prisma.prescription.count({ where }),
  ]);

  return { items, total };
}

export async function createPrescription(data: Prisma.PrescriptionCreateInput) {
  return prisma.prescription.create({ data, include: prescriptionInclude });
}

export async function updatePrescription(
  id: string,
  data: Prisma.PrescriptionUpdateInput
) {
  return prisma.prescription.update({
    where: { id },
    data,
    include: prescriptionInclude,
  });
}

export async function softDeletePrescription(id: string) {
  return prisma.prescription.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
