import type { NextRequest } from "next/server";

import { requireRole, requireSession } from "@/core/auth/rbac";
import { ADMIN_ROLES } from "@/core/auth/roles";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import {
  createDoctorSchema,
  listDoctorsQuerySchema,
  updateDoctorSchema,
} from "@/features/doctors/validation/doctor.validation";
import {
  createDoctorService,
  deleteDoctorService,
  getDoctorByIdService,
  getOwnDoctorProfileService,
  listDoctorsService,
  updateDoctorService,
} from "@/features/doctors/services/doctor.service";

export async function listDoctorsHandler(request: NextRequest) {
  await requireSession();

  const query = listDoctorsQuerySchema.parse(parseSearchParams(request.url));
  const { items, meta } = await listDoctorsService(query);

  return successResponse(items, { meta });
}

export async function createDoctorHandler(request: NextRequest) {
  const session = await requireRole(...ADMIN_ROLES);

  const body = createDoctorSchema.parse(await request.json());
  const doctor = await createDoctorService(session.user.id, body);

  return successResponse(doctor, { status: 201 });
}

export async function getOwnDoctorProfileHandler(_request: NextRequest) {
  const session = await requireRole("DOCTOR");
  const doctor = await getOwnDoctorProfileService(session);
  return successResponse(doctor);
}

export async function getDoctorHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const doctor = await getDoctorByIdService(id);

  return successResponse(doctor);
}

export async function updateDoctorHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const body = updateDoctorSchema.parse(await request.json());
  const doctor = await updateDoctorService(session, id, body);

  return successResponse(doctor);
}

export async function deleteDoctorHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  await deleteDoctorService(session, id);

  return successResponse({ id });
}
