import type { NextRequest } from "next/server";

import { requireRole } from "@/core/auth/rbac";
import { ADMIN_ROLES } from "@/core/auth/roles";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { reportRangeQuerySchema } from "@/features/reports/validation/report.validation";
import {
  getAppointmentReportService,
  getDashboardOverviewService,
  getDoctorReportService,
  getPatientReportService,
  getPaymentReportService,
} from "@/features/reports/services/report.service";

export async function getDashboardOverviewHandler(request: NextRequest) {
  const session = await requireRole(...ADMIN_ROLES);

  const query = reportRangeQuerySchema.parse(parseSearchParams(request.url));
  const overview = await getDashboardOverviewService(session, query);

  return successResponse(overview);
}

export async function getPatientReportHandler(request: NextRequest) {
  await requireRole(...ADMIN_ROLES);

  const query = reportRangeQuerySchema.parse(parseSearchParams(request.url));
  const report = await getPatientReportService(query);

  return successResponse(report);
}

export async function getDoctorReportHandler(_request: NextRequest) {
  await requireRole(...ADMIN_ROLES);

  const report = await getDoctorReportService();

  return successResponse(report);
}

export async function getAppointmentReportHandler(request: NextRequest) {
  await requireRole(...ADMIN_ROLES);

  const query = reportRangeQuerySchema.parse(parseSearchParams(request.url));
  const report = await getAppointmentReportService(query);

  return successResponse(report);
}

export async function getPaymentReportHandler(request: NextRequest) {
  await requireRole(...ADMIN_ROLES);

  const query = reportRangeQuerySchema.parse(parseSearchParams(request.url));
  const report = await getPaymentReportService(query);

  return successResponse(report);
}
