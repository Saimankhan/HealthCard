import "server-only";
import { prisma } from "@/core/db/prisma";
import type { MedicalReportCategory, Prisma } from "@/generated/prisma/client";

const medicalReportInclude = {
  patient: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  doctor: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

export async function findMedicalReportById(id: string) {
  return prisma.medicalReport.findFirst({
    where: { id, deletedAt: null },
    include: medicalReportInclude,
  });
}

export async function listMedicalReports(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  patientId?: string;
  doctorId?: string;
  category?: MedicalReportCategory;
}) {
  const where: Prisma.MedicalReportWhereInput = {
    deletedAt: null,
    ...(params.patientId ? { patientId: params.patientId } : {}),
    ...(params.doctorId ? { doctorId: params.doctorId } : {}),
    ...(params.category ? { category: params.category } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.medicalReport.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { uploadedAt: params.sortOrder },
      include: medicalReportInclude,
    }),
    prisma.medicalReport.count({ where }),
  ]);

  return { items, total };
}

export async function createMedicalReport(
  data: Prisma.MedicalReportCreateInput
) {
  return prisma.medicalReport.create({
    data,
    include: medicalReportInclude,
  });
}

export async function updateMedicalReport(
  id: string,
  data: Prisma.MedicalReportUpdateInput
) {
  return prisma.medicalReport.update({
    where: { id },
    data,
    include: medicalReportInclude,
  });
}

export async function softDeleteMedicalReport(id: string) {
  return prisma.medicalReport.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
