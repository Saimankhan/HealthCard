import "server-only";
import { prisma } from "@/core/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

const userSummarySelect = {
  select: { id: true, name: true, email: true, image: true },
} as const;

const doctorInclude = {
  user: userSummarySelect,
  specializations: { include: { specialization: true } },
} as const;

export async function findDoctorById(id: string) {
  return prisma.doctor.findFirst({
    where: { id, deletedAt: null },
    include: doctorInclude,
  });
}

export async function findDoctorByUserId(userId: string) {
  return prisma.doctor.findFirst({
    where: { userId, deletedAt: null },
    include: doctorInclude,
  });
}

/** Includes soft-deleted doctors; only for cascading a user-account restore. */
export async function findDoctorByUserIdIncludingDeleted(userId: string) {
  return prisma.doctor.findFirst({
    where: { userId },
    include: doctorInclude,
  });
}

export async function listDoctors(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  specializationId?: string;
  search?: string;
}) {
  const where: Prisma.DoctorWhereInput = {
    deletedAt: null,
    ...(params.specializationId
      ? {
          specializations: {
            some: { specializationId: params.specializationId },
          },
        }
      : {}),
    ...(params.search
      ? {
          OR: [
            {
              user: { name: { contains: params.search, mode: "insensitive" } },
            },
            { licenseNumber: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: params.sortOrder },
      include: doctorInclude,
    }),
    prisma.doctor.count({ where }),
  ]);

  return { items, total };
}

export async function createDoctor(
  data: Prisma.DoctorCreateInput,
  specializationIds: string[] = []
) {
  return prisma.$transaction(async (tx) => {
    const doctor = await tx.doctor.create({ data });
    if (specializationIds.length > 0) {
      await tx.doctorSpecialization.createMany({
        data: specializationIds.map((specializationId) => ({
          doctorId: doctor.id,
          specializationId,
        })),
      });
    }
    return tx.doctor.findFirstOrThrow({
      where: { id: doctor.id },
      include: doctorInclude,
    });
  });
}

export async function updateDoctor(
  id: string,
  data: Prisma.DoctorUpdateInput,
  specializationIds?: string[]
) {
  return prisma.$transaction(async (tx) => {
    await tx.doctor.update({ where: { id }, data });

    if (specializationIds) {
      await tx.doctorSpecialization.deleteMany({ where: { doctorId: id } });
      if (specializationIds.length > 0) {
        await tx.doctorSpecialization.createMany({
          data: specializationIds.map((specializationId) => ({
            doctorId: id,
            specializationId,
          })),
        });
      }
    }

    return tx.doctor.findFirstOrThrow({
      where: { id },
      include: doctorInclude,
    });
  });
}

export async function softDeleteDoctor(id: string) {
  return prisma.doctor.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function restoreDoctor(id: string) {
  return prisma.doctor.update({
    where: { id },
    data: { deletedAt: null },
  });
}
