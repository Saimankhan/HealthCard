import type { NextRequest } from "next/server";

import { requireSession } from "@/core/auth/rbac";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import {
  createMedicalReportSchema,
  listMedicalReportsQuerySchema,
  requestUploadUrlSchema,
  updateMedicalReportSchema,
} from "@/features/medical-reports/validation/medical-report.validation";
import {
  createMedicalReportService,
  deleteMedicalReportService,
  getMedicalReportByIdService,
  listMedicalReportsService,
  requestUploadUrlService,
  updateMedicalReportService,
} from "@/features/medical-reports/services/medical-report.service";

export async function requestUploadUrlHandler(request: NextRequest) {
  const session = await requireSession();

  const body = requestUploadUrlSchema.parse(await request.json());
  const result = await requestUploadUrlService(session, body);

  return successResponse(result);
}

export async function listMedicalReportsHandler(request: NextRequest) {
  const session = await requireSession();

  const query = listMedicalReportsQuerySchema.parse(
    parseSearchParams(request.url)
  );
  const { items, meta } = await listMedicalReportsService(session, query);

  return successResponse(items, { meta });
}

export async function createMedicalReportHandler(request: NextRequest) {
  const session = await requireSession();

  const body = createMedicalReportSchema.parse(await request.json());
  const report = await createMedicalReportService(session, body);

  return successResponse(report, { status: 201 });
}

export async function getMedicalReportHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const report = await getMedicalReportByIdService(session, id);

  return successResponse(report);
}

export async function updateMedicalReportHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const body = updateMedicalReportSchema.parse(await request.json());
  const report = await updateMedicalReportService(session, id, body);

  return successResponse(report);
}

export async function deleteMedicalReportHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  await deleteMedicalReportService(session, id);

  return successResponse({ id });
}
