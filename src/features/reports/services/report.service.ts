import "server-only";
import * as reportRepo from "@/features/reports/repository/report.repository";
import { listAuditLogsService } from "@/features/audit-logs/services/audit-log.service";
import { listAuditLogsQuerySchema } from "@/features/audit-logs/validation/audit-log.validation";
import { listOwnNotificationsService } from "@/features/notifications/services/notification.service";
import { listNotificationsQuerySchema } from "@/features/notifications/validation/notification.validation";
import type { Session } from "@/core/auth/auth";
import type { ReportRangeQuery } from "@/features/reports/validation/report.validation";

function sinceDaysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function serializeDayCounts(rows: { day: Date; count: bigint }[]) {
  return rows.map((row) => ({
    date: row.day.toISOString().slice(0, 10),
    count: Number(row.count),
  }));
}

function serializeDayTotals(rows: { day: Date; total: string }[]) {
  return rows.map((row) => ({
    date: row.day.toISOString().slice(0, 10),
    total: Number(row.total),
  }));
}

export async function getDashboardOverviewService(
  session: Session,
  query: ReportRangeQuery
) {
  const since = sinceDaysAgo(query.days);

  const [
    counts,
    appointmentsByStatus,
    appointmentVolume,
    revenueByDay,
    recentActivity,
    notifications,
  ] = await Promise.all([
    reportRepo.getOverviewCounts(),
    reportRepo.getAppointmentCountsByStatus(),
    reportRepo.getAppointmentVolumeByDay(since),
    reportRepo.getRevenueByDay(since),
    listAuditLogsService(
      listAuditLogsQuerySchema.parse({
        page: 1,
        pageSize: 8,
        sortOrder: "desc",
      })
    ),
    listOwnNotificationsService(
      session,
      listNotificationsQuerySchema.parse({
        page: 1,
        pageSize: 5,
        sortOrder: "desc",
      })
    ),
  ]);

  return {
    ...counts,
    appointmentsByStatus: appointmentsByStatus.map((row) => ({
      status: row.status,
      count: row._count._all,
    })),
    appointmentVolume: serializeDayCounts(appointmentVolume),
    revenueByDay: serializeDayTotals(revenueByDay),
    recentActivity: recentActivity.items,
    notifications: notifications.items,
  };
}

export async function getPatientReportService(query: ReportRangeQuery) {
  const since = sinceDaysAgo(query.days);

  const [byGender, byBloodGroup, registrations] = await Promise.all([
    reportRepo.getPatientCountsByGender(),
    reportRepo.getPatientCountsByBloodGroup(),
    reportRepo.getPatientRegistrationsByDay(since),
  ]);

  const total = byGender.reduce((sum, row) => sum + row._count._all, 0);

  return {
    total,
    byGender: byGender.map((row) => ({
      gender: row.gender ?? "UNSPECIFIED",
      count: row._count._all,
    })),
    byBloodGroup: byBloodGroup.map((row) => ({
      bloodGroup: row.bloodGroup ?? "UNSPECIFIED",
      count: row._count._all,
    })),
    registrations: serializeDayCounts(registrations),
  };
}

export async function getDoctorReportService() {
  const [appointmentCounts, specializationCounts, doctors, specializations] =
    await Promise.all([
      reportRepo.getDoctorAppointmentCounts(),
      reportRepo.getDoctorsBySpecializationCounts(),
      reportRepo.listDoctorsForReport(),
      reportRepo.listSpecializationNames(),
    ]);

  const appointmentCountByDoctorId = new Map(
    appointmentCounts.map((row) => [row.doctorId, row._count._all])
  );
  const specializationNameById = new Map(
    specializations.map((s) => [s.id, s.name])
  );

  const topDoctors = doctors
    .map((doctor) => ({
      id: doctor.id,
      name: doctor.user.name,
      appointmentCount: appointmentCountByDoctorId.get(doctor.id) ?? 0,
    }))
    .sort((a, b) => b.appointmentCount - a.appointmentCount)
    .slice(0, 10);

  return {
    total: doctors.length,
    bySpecialization: specializationCounts.map((row) => ({
      specialization:
        specializationNameById.get(row.specializationId) ?? "Unknown",
      count: row._count._all,
    })),
    topDoctors,
  };
}

export async function getAppointmentReportService(query: ReportRangeQuery) {
  const since = sinceDaysAgo(query.days);

  const [byStatus, volume] = await Promise.all([
    reportRepo.getAppointmentCountsByStatus(),
    reportRepo.getAppointmentVolumeByDay(since),
  ]);

  const total = byStatus.reduce((sum, row) => sum + row._count._all, 0);

  return {
    total,
    byStatus: byStatus.map((row) => ({
      status: row.status,
      count: row._count._all,
    })),
    volume: serializeDayCounts(volume),
  };
}

export async function getPaymentReportService(query: ReportRangeQuery) {
  const since = sinceDaysAgo(query.days);

  const [byStatus, byMethod, revenueByDay, refunds] = await Promise.all([
    reportRepo.getPaymentCountsByStatus(),
    reportRepo.getRevenueByMethod(),
    reportRepo.getRevenueByDay(since),
    reportRepo.getRefundTotals(),
  ]);

  const totalRevenue = byStatus
    .filter((row) => row.status === "SUCCEEDED")
    .reduce((sum, row) => sum + Number(row._sum.amount ?? 0), 0);

  return {
    totalRevenue,
    byStatus: byStatus.map((row) => ({
      status: row.status,
      count: row._count._all,
      total: Number(row._sum.amount ?? 0),
    })),
    byMethod: byMethod.map((row) => ({
      method: row.method,
      count: row._count._all,
      total: Number(row._sum.amount ?? 0),
    })),
    revenueByDay: serializeDayTotals(revenueByDay),
    refundTotal: Number(refunds._sum.refundedAmount ?? 0),
    refundCount: refunds._count._all,
  };
}
