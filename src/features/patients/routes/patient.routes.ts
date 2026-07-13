import type { NextRequest } from "next/server";

import { requireRole, requireSession } from "@/core/auth/rbac";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import {
  createPatientSchema,
  listPatientsQuerySchema,
  updatePatientSchema,
} from "@/features/patients/validation/patient.validation";
import {
  createPatientService,
  deletePatientService,
  getOwnPatientProfileService,
  getPatientByIdService,
  listPatientsService,
  updatePatientService,
} from "@/features/patients/services/patient.service";

export async function listPatientsHandler(request: NextRequest) {
  await requireRole("ADMIN", "DOCTOR");

  const query = listPatientsQuerySchema.parse(parseSearchParams(request.url));
  const { items, meta } = await listPatientsService(query);

  return successResponse(items, { meta });
}

export async function createPatientHandler(request: NextRequest) {
  const session = await requireRole("ADMIN");

  const body = createPatientSchema.parse(await request.json());
  const patient = await createPatientService(session.user.id, body);

  return successResponse(patient, { status: 201 });
}

export async function getOwnPatientProfileHandler(_request: NextRequest) {
  const session = await requireRole("PATIENT");
  const patient = await getOwnPatientProfileService(session);
  return successResponse(patient);
}

export async function getPatientHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const patient = await getPatientByIdService(session, id);

  return successResponse(patient);
}

export async function updatePatientHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const body = updatePatientSchema.parse(await request.json());
  const patient = await updatePatientService(session, id, body);

  return successResponse(patient);
}

export async function deletePatientHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  await deletePatientService(session, id);

  return successResponse({ id });
}
