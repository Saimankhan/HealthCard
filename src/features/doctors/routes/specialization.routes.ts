import type { NextRequest } from "next/server";

import { requireRole, requireSession } from "@/core/auth/rbac";
import { ADMIN_ROLES } from "@/core/auth/roles";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import {
  createSpecializationSchema,
  listSpecializationsQuerySchema,
  updateSpecializationSchema,
} from "@/features/doctors/validation/specialization.validation";
import {
  createSpecializationService,
  deleteSpecializationService,
  listSpecializationsService,
  updateSpecializationService,
} from "@/features/doctors/services/specialization.service";

export async function listSpecializationsHandler(request: NextRequest) {
  await requireSession();

  const query = listSpecializationsQuerySchema.parse(
    parseSearchParams(request.url)
  );
  const { items, meta } = await listSpecializationsService(query);

  return successResponse(items, { meta });
}

export async function createSpecializationHandler(request: NextRequest) {
  const session = await requireRole(...ADMIN_ROLES);

  const body = createSpecializationSchema.parse(await request.json());
  const specialization = await createSpecializationService(
    session.user.id,
    body
  );

  return successResponse(specialization, { status: 201 });
}

export async function updateSpecializationHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = idParamSchema.parse(await context.params);
  const body = updateSpecializationSchema.parse(await request.json());
  const specialization = await updateSpecializationService(
    session.user.id,
    id,
    body
  );

  return successResponse(specialization);
}

export async function deleteSpecializationHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = idParamSchema.parse(await context.params);
  await deleteSpecializationService(session.user.id, id);

  return successResponse({ id });
}
