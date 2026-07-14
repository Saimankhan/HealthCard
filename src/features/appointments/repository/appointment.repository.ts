import "server-only";
import { prisma } from "@/core/db/prisma";
import type { AppointmentStatus, Prisma } from "@/generated/prisma/client";

const appointmentInclude = {
  patient: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  doctor: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

export async function findAppointmentById(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });
}

export async function findActiveAppointmentsForDoctorInRange(
  doctorId: string,
  rangeStart: Date,
  rangeEnd: Date,
  excludeId?: string
) {
  return prisma.appointment.findMany({
    where: {
      doctorId,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledAt: {
        gte: new Date(rangeStart.getTime() - 4 * 60 * 60 * 1000),
        lt: rangeEnd,
      },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

export async function listAppointments(params: {
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
  status?: AppointmentStatus;
  patientId?: string;
  doctorId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}) {
  const where: Prisma.AppointmentWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.patientId ? { patientId: params.patientId } : {}),
    ...(params.doctorId ? { doctorId: params.doctorId } : {}),
    ...(params.from || params.to
      ? {
          scheduledAt: {
            ...(params.from ? { gte: params.from } : {}),
            ...(params.to ? { lte: params.to } : {}),
          },
        }
      : {}),
    ...(params.search
      ? {
          OR: [
            {
              patient: {
                user: {
                  name: { contains: params.search, mode: "insensitive" },
                },
              },
            },
            {
              doctor: {
                user: {
                  name: { contains: params.search, mode: "insensitive" },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { scheduledAt: params.sortOrder },
      include: appointmentInclude,
    }),
    prisma.appointment.count({ where }),
  ]);

  return { items, total };
}

export async function createAppointment(data: Prisma.AppointmentCreateInput) {
  return prisma.appointment.create({ data, include: appointmentInclude });
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
) {
  return prisma.appointment.update({
    where: { id },
    data: {
      status,
      cancelledAt: status === "CANCELLED" ? new Date() : null,
    },
    include: appointmentInclude,
  });
}

export async function rescheduleAppointment(id: string, scheduledAt: Date) {
  return prisma.appointment.update({
    where: { id },
    data: { scheduledAt, status: "PENDING" },
    include: appointmentInclude,
  });
}

export async function findAppointmentsNeedingReminder(
  windowStart: Date,
  windowEnd: Date
) {
  return prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      scheduledAt: { gte: windowStart, lte: windowEnd },
    },
    include: appointmentInclude,
  });
}

export async function markReminderSent(id: string) {
  return prisma.appointment.update({
    where: { id },
    data: { reminderSentAt: new Date() },
  });
}

export async function findExpiredPendingAppointments(before: Date) {
  return prisma.appointment.findMany({
    where: { status: "PENDING", scheduledAt: { lt: before } },
    include: appointmentInclude,
  });
}

export async function existsAppointmentForDoctorAndPatient(
  doctorId: string,
  patientId: string
) {
  const appointment = await prisma.appointment.findFirst({
    where: { doctorId, patientId },
    select: { id: true },
  });
  return appointment !== null;
}
