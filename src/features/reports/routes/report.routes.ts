import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/core/auth/rbac";
import { ADMIN_ROLES } from "@/core/auth/roles";
import { BadRequestError } from "@/core/api/errors";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import {
  exportQuerySchema,
  reportRangeQuerySchema,
} from "@/features/reports/validation/report.validation";
import {
  getAppointmentReportService,
  getDashboardOverviewService,
  getDoctorReportService,
  getPatientReportService,
  getPaymentReportService,
} from "@/features/reports/services/report.service";
import {
  EXPORT_DOMAINS,
  exportReportService,
  type ExportDomain,
} from "@/features/reports/services/export.service";

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

export async function exportReportHandler(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  await requireRole(...ADMIN_ROLES);

  const { domain } = await context.params;
  if (!EXPORT_DOMAINS.includes(domain as ExportDomain)) {
    throw new BadRequestError("Unknown export domain");
  }

  const { format } = exportQuerySchema.parse(parseSearchParams(request.url));
  const { buffer, contentType, extension } = await exportReportService(
    domain as ExportDomain,
    format
  );

  const filename = `${domain}-${new Date().toISOString().slice(0, 10)}.${extension}`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
