import type { NextRequest } from "next/server";

import { requireSession } from "@/core/auth/rbac";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import {
  createMedicalHistorySchema,
  listMedicalHistoryQuerySchema,
  updateMedicalHistorySchema,
} from "@/features/medical-history/validation/medical-history.validation";
import {
  createMedicalHistoryService,
  deleteMedicalHistoryService,
  getMedicalHistoryByIdService,
  listMedicalHistoryService,
  updateMedicalHistoryService,
} from "@/features/medical-history/services/medical-history.service";

export async function listMedicalHistoryHandler(request: NextRequest) {
  const session = await requireSession();

  const query = listMedicalHistoryQuerySchema.parse(
    parseSearchParams(request.url)
  );
  const { items, meta } = await listMedicalHistoryService(session, query);

  return successResponse(items, { meta });
}

export async function createMedicalHistoryHandler(request: NextRequest) {
  const session = await requireSession();

  const body = createMedicalHistorySchema.parse(await request.json());
  const record = await createMedicalHistoryService(session, body);

  return successResponse(record, { status: 201 });
}

export async function getMedicalHistoryHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const record = await getMedicalHistoryByIdService(session, id);

  return successResponse(record);
}

export async function updateMedicalHistoryHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const body = updateMedicalHistorySchema.parse(await request.json());
  const record = await updateMedicalHistoryService(session, id, body);

  return successResponse(record);
}

export async function deleteMedicalHistoryHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  await deleteMedicalHistoryService(session, id);

  return successResponse({ id });
}
