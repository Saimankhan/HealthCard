import "server-only";
import { prisma } from "@/core/db/prisma";
import type { BloodGroup, Gender, Prisma } from "@/generated/prisma/client";

const userSummarySelect = {
  select: { id: true, name: true, email: true, image: true },
} as const;

export async function findPatientById(id: string) {
  return prisma.patient.findFirst({
    where: { id, deletedAt: null },
    include: { user: userSummarySelect, healthCard: true },
  });
}

export async function findPatientByUserId(userId: string) {
  return prisma.patient.findFirst({
    where: { userId, deletedAt: null },
    include: { user: userSummarySelect, healthCard: true },
  });
}

export async function listPatients(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  gender?: Gender;
  bloodGroup?: BloodGroup;
  search?: string;
  doctorId?: string;
}) {
  const where: Prisma.PatientWhereInput = {
    deletedAt: null,
    ...(params.gender ? { gender: params.gender } : {}),
    ...(params.bloodGroup ? { bloodGroup: params.bloodGroup } : {}),
    ...(params.doctorId
      ? { appointments: { some: { doctorId: params.doctorId } } }
      : {}),
    ...(params.search
      ? {
          user: {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { email: { contains: params.search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: params.sortOrder },
      include: { user: userSummarySelect },
    }),
    prisma.patient.count({ where }),
  ]);

  return { items, total };
}

export async function createPatient(data: Prisma.PatientCreateInput) {
  return prisma.patient.create({ data, include: { user: userSummarySelect } });
}

export async function updatePatient(
  id: string,
  data: Prisma.PatientUpdateInput
) {
  return prisma.patient.update({
    where: { id },
    data,
    include: { user: userSummarySelect },
  });
}

export async function softDeletePatient(id: string) {
  return prisma.patient.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
