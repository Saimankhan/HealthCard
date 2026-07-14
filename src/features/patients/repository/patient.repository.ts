import "server-only";
import { prisma } from "@/core/db/prisma";
import type {
  AppointmentStatus,
  BloodGroup,
  Gender,
  Prisma,
} from "@/generated/prisma/client";

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

/** Includes soft-deleted patients; only for cascading a user-account restore. */
export async function findPatientByUserIdIncludingDeleted(userId: string) {
  return prisma.patient.findFirst({
    where: { userId },
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
  phone?: string;
  healthCardNumber?: string;
  doctorId?: string;
  appointmentStatus?: AppointmentStatus;
}) {
  const appointmentFilter =
    params.doctorId || params.appointmentStatus
      ? {
          appointments: {
            some: {
              ...(params.doctorId ? { doctorId: params.doctorId } : {}),
              ...(params.appointmentStatus
                ? { status: params.appointmentStatus }
                : {}),
            },
          },
        }
      : {};

  const where: Prisma.PatientWhereInput = {
    deletedAt: null,
    ...(params.gender ? { gender: params.gender } : {}),
    ...(params.bloodGroup ? { bloodGroup: params.bloodGroup } : {}),
    ...(params.phone
      ? { phone: { contains: params.phone, mode: "insensitive" } }
      : {}),
    ...(params.healthCardNumber
      ? {
          healthCard: {
            cardNumber: {
              contains: params.healthCardNumber,
              mode: "insensitive",
            },
          },
        }
      : {}),
    ...appointmentFilter,
    ...(params.search
      ? {
          OR: [
            {
              user: { name: { contains: params.search, mode: "insensitive" } },
            },
            {
              user: { email: { contains: params.search, mode: "insensitive" } },
            },
            { phone: { contains: params.search, mode: "insensitive" } },
            {
              healthCard: {
                cardNumber: { contains: params.search, mode: "insensitive" },
              },
            },
          ],
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

export async function restorePatient(id: string) {
  return prisma.patient.update({
    where: { id },
    data: { deletedAt: null },
  });
}
