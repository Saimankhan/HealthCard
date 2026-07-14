import "server-only";
import * as reportRepo from "@/features/reports/repository/report.repository";
import { listAuditLogsService } from "@/features/audit-logs/services/audit-log.service";
import { listAuditLogsQuerySchema } from "@/features/audit-logs/validation/audit-log.validation";
import { listOwnNotificationsService } from "@/features/notifications/services/notification.service";
import { listNotificationsQuerySchema } from "@/features/notifications/validation/notification.validation";
import { CACHE_TTL, getOrSetCache } from "@/core/cache/cache";
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

function sumCountsInWindow(
  rows: { day: Date; count: bigint }[],
  from: Date,
  to: Date
): number {
  return rows
    .filter((row) => row.day >= from && row.day < to)
    .reduce((sum, row) => sum + Number(row.count), 0);
}

function sumTotalsInWindow(
  rows: { day: Date; total: string }[],
  from: Date,
  to: Date
): number {
  return rows
    .filter((row) => row.day >= from && row.day < to)
    .reduce((sum, row) => sum + Number(row.total), 0);
}

/** Period-over-period % change, rounded to one decimal. 0→positive reads as +100%. */
function percentChange(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Exported so mutating services elsewhere can invalidate the common days=14/30 dashboard keys. */
export function dashboardAggregatesCacheKey(days: number) {
  return `cache:dashboard:overview:${days}`;
}

export const DASHBOARD_CACHE_INVALIDATION_DAYS = [14, 30] as const;

/**
 * Everything here is global (not session-scoped), unlike the caller's
 * per-user notifications feed — keeping that split is what makes this safe
 * to cache: a naive whole-response cache would leak one admin's
 * notifications to the next admin who hits the dashboard within the TTL.
 */
async function getCachedDashboardAggregates(days: number) {
  return getOrSetCache(
    dashboardAggregatesCacheKey(days),
    CACHE_TTL.dashboard,
    async () => {
      const now = new Date();
      const since = sinceDaysAgo(days);
      // Fetch a 2x window so the current period can be compared against the
      // one immediately before it for growth %, without a second round trip.
      const previousWindowStart = sinceDaysAgo(days * 2);

      const [
        counts,
        appointmentsByStatus,
        appointmentVolumeFull,
        revenueByDayFull,
        registrationsFull,
        recentActivity,
      ] = await Promise.all([
        reportRepo.getOverviewCounts(),
        reportRepo.getAppointmentCountsByStatus(),
        reportRepo.getAppointmentVolumeByDay(previousWindowStart),
        reportRepo.getRevenueByDay(previousWindowStart),
        reportRepo.getPatientRegistrationsByDay(previousWindowStart),
        listAuditLogsService(
          listAuditLogsQuerySchema.parse({
            page: 1,
            pageSize: 8,
            sortOrder: "desc",
          })
        ),
      ]);

      const appointmentVolume = appointmentVolumeFull.filter(
        (row) => row.day >= since
      );
      const revenueByDay = revenueByDayFull.filter((row) => row.day >= since);

      const growth = {
        patients: percentChange(
          sumCountsInWindow(registrationsFull, previousWindowStart, since),
          sumCountsInWindow(registrationsFull, since, now)
        ),
        appointments: percentChange(
          sumCountsInWindow(appointmentVolumeFull, previousWindowStart, since),
          sumCountsInWindow(appointmentVolumeFull, since, now)
        ),
        revenue: percentChange(
          sumTotalsInWindow(revenueByDayFull, previousWindowStart, since),
          sumTotalsInWindow(revenueByDayFull, since, now)
        ),
      };

      return {
        ...counts,
        appointmentsByStatus: appointmentsByStatus.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
        appointmentVolume: serializeDayCounts(appointmentVolume),
        revenueByDay: serializeDayTotals(revenueByDay),
        recentActivity: recentActivity.items,
        growth,
      };
    }
  );
}

export async function getDashboardOverviewService(
  session: Session,
  query: ReportRangeQuery
) {
  const [aggregates, notifications] = await Promise.all([
    getCachedDashboardAggregates(query.days),
    listOwnNotificationsService(
      session,
      listNotificationsQuerySchema.parse({
        page: 1,
        pageSize: 5,
        sortOrder: "desc",
      })
    ),
  ]);

  return { ...aggregates, notifications: notifications.items };
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

export async function getPrescriptionReportService(query: ReportRangeQuery) {
  const since = sinceDaysAgo(query.days);

  const [volume, countsByDoctor, doctors] = await Promise.all([
    reportRepo.getPrescriptionVolumeByDay(since),
    reportRepo.getPrescriptionCountsByDoctor(),
    reportRepo.listDoctorsForReport(),
  ]);

  const doctorNameById = new Map(doctors.map((d) => [d.id, d.user.name]));
  const total = countsByDoctor.reduce((sum, row) => sum + row._count._all, 0);

  const byDoctor = countsByDoctor
    .map((row) => ({
      doctorId: row.doctorId,
      doctorName: doctorNameById.get(row.doctorId) ?? "Unknown",
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total,
    byDoctor,
    volume: serializeDayCounts(volume),
  };
}

export async function getDauReportService(query: ReportRangeQuery) {
  const since = sinceDaysAgo(query.days);
  const rows = await reportRepo.getDailyActiveUserCounts(since);
  const series = serializeDayCounts(rows);
  const today = series.at(-1)?.count ?? 0;

  return { series, today };
}

export async function getSystemHealthService() {
  const start = Date.now();
  try {
    await reportRepo.pingDatabase();
    return { status: "ok" as const, latencyMs: Date.now() - start };
  } catch {
    return { status: "error" as const, latencyMs: Date.now() - start };
  }
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
