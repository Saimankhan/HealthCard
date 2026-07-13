import type { NextRequest } from "next/server";

import { requireSession } from "@/core/auth/rbac";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import {
  createPrescriptionSchema,
  listPrescriptionsQuerySchema,
  updatePrescriptionSchema,
} from "@/features/prescriptions/validation/prescription.validation";
import {
  createPrescriptionService,
  deletePrescriptionService,
  getPrescriptionByIdService,
  listPrescriptionsService,
  updatePrescriptionService,
} from "@/features/prescriptions/services/prescription.service";

export async function listPrescriptionsHandler(request: NextRequest) {
  const session = await requireSession();

  const query = listPrescriptionsQuerySchema.parse(
    parseSearchParams(request.url)
  );
  const { items, meta } = await listPrescriptionsService(session, query);

  return successResponse(items, { meta });
}

export async function createPrescriptionHandler(request: NextRequest) {
  const session = await requireSession();

  const body = createPrescriptionSchema.parse(await request.json());
  const prescription = await createPrescriptionService(session, body);

  return successResponse(prescription, { status: 201 });
}

export async function getPrescriptionHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const prescription = await getPrescriptionByIdService(session, id);

  return successResponse(prescription);
}

export async function updatePrescriptionHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const body = updatePrescriptionSchema.parse(await request.json());
  const prescription = await updatePrescriptionService(session, id, body);

  return successResponse(prescription);
}

export async function deletePrescriptionHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  await deletePrescriptionService(session, id);

  return successResponse({ id });
}
