import "server-only";
import { prisma } from "@/core/db/prisma";

export async function getOverviewCounts() {
  const [
    totalUsers,
    totalPatients,
    totalDoctors,
    totalAppointments,
    revenueAgg,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.patient.count({ where: { deletedAt: null } }),
    prisma.doctor.count({ where: { deletedAt: null } }),
    prisma.appointment.count(),
    prisma.payment.aggregate({
      where: { status: "SUCCEEDED" },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalUsers,
    totalPatients,
    totalDoctors,
    totalAppointments,
    totalRevenue: revenueAgg._sum.amount?.toString() ?? "0",
  };
}

export async function getAppointmentCountsByStatus() {
  return prisma.appointment.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
}

export async function getAppointmentVolumeByDay(sinceDate: Date) {
  return prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', "scheduledAt") as day, COUNT(*)::bigint as count
    FROM "appointment"
    WHERE "scheduledAt" >= ${sinceDate}
    GROUP BY day
    ORDER BY day ASC
  `;
}

export async function getPaymentCountsByStatus() {
  return prisma.payment.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { amount: true },
  });
}

export async function getRevenueByMethod() {
  return prisma.payment.groupBy({
    by: ["method"],
    where: { status: "SUCCEEDED" },
    _sum: { amount: true },
    _count: { _all: true },
  });
}

export async function getRevenueByDay(sinceDate: Date) {
  return prisma.$queryRaw<{ day: Date; total: string }[]>`
    SELECT date_trunc('day', "createdAt") as day, COALESCE(SUM("amount"), 0)::numeric as total
    FROM "payment"
    WHERE "status" = 'SUCCEEDED' AND "createdAt" >= ${sinceDate}
    GROUP BY day
    ORDER BY day ASC
  `;
}

export async function getRefundTotals() {
  return prisma.payment.aggregate({
    where: { status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
    _sum: { refundedAmount: true },
    _count: { _all: true },
  });
}

export async function getPatientCountsByGender() {
  return prisma.patient.groupBy({
    by: ["gender"],
    where: { deletedAt: null },
    _count: { _all: true },
  });
}

export async function getPatientCountsByBloodGroup() {
  return prisma.patient.groupBy({
    by: ["bloodGroup"],
    where: { deletedAt: null },
    _count: { _all: true },
  });
}

export async function getPatientRegistrationsByDay(sinceDate: Date) {
  return prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', "createdAt") as day, COUNT(*)::bigint as count
    FROM "patient"
    WHERE "createdAt" >= ${sinceDate} AND "deletedAt" IS NULL
    GROUP BY day
    ORDER BY day ASC
  `;
}

export async function getDoctorAppointmentCounts() {
  return prisma.appointment.groupBy({
    by: ["doctorId"],
    _count: { _all: true },
  });
}

export async function getDoctorsBySpecializationCounts() {
  return prisma.doctorSpecialization.groupBy({
    by: ["specializationId"],
    _count: { _all: true },
  });
}

export async function listDoctorsForReport() {
  return prisma.doctor.findMany({
    where: { deletedAt: null },
    include: { user: { select: { id: true, name: true } } },
  });
}

export async function listSpecializationNames() {
  return prisma.specialization.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
}

export async function pingDatabase() {
  await prisma.$queryRaw`SELECT 1`;
}

export async function getPrescriptionVolumeByDay(sinceDate: Date) {
  return prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', "issuedAt") as day, COUNT(*)::bigint as count
    FROM "prescription"
    WHERE "issuedAt" >= ${sinceDate} AND "deletedAt" IS NULL
    GROUP BY day
    ORDER BY day ASC
  `;
}

export async function getPrescriptionCountsByDoctor() {
  return prisma.prescription.groupBy({
    by: ["doctorId"],
    where: { deletedAt: null },
    _count: { _all: true },
  });
}

/** DAU based on audit-log LOGIN entries (written by the session.create.after auth hook). */
export async function getDailyActiveUserCounts(sinceDate: Date) {
  return prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', "createdAt") as day, COUNT(DISTINCT "actorId")::bigint as count
    FROM "audit_log"
    WHERE "action" = 'LOGIN' AND "createdAt" >= ${sinceDate} AND "actorId" IS NOT NULL
    GROUP BY day
    ORDER BY day ASC
  `;
}
