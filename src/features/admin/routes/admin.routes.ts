import type { NextRequest } from "next/server";

import { requireRole } from "@/core/auth/rbac";
import { ADMIN_ROLES } from "@/core/auth/roles";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import {
  createAdminSchema,
  listAdminsQuerySchema,
  updateAdminSchema,
} from "@/features/admin/validation/admin.validation";
import {
  createAdminService,
  deleteAdminService,
  getAdminByIdService,
  getOwnAdminProfileService,
  listAdminsService,
  updateAdminService,
} from "@/features/admin/services/admin.service";

export async function listAdminsHandler(request: NextRequest) {
  await requireRole(...ADMIN_ROLES);

  const query = listAdminsQuerySchema.parse(parseSearchParams(request.url));
  const { items, meta } = await listAdminsService(query);

  return successResponse(items, { meta });
}

// Only a super admin can grant admin access to a user.
export async function createAdminHandler(request: NextRequest) {
  const session = await requireRole("SUPER_ADMIN");

  const body = createAdminSchema.parse(await request.json());
  const admin = await createAdminService(session.user.id, body);

  return successResponse(admin, { status: 201 });
}

export async function getOwnAdminProfileHandler(_request: NextRequest) {
  const session = await requireRole(...ADMIN_ROLES);
  const admin = await getOwnAdminProfileService(session);
  return successResponse(admin);
}

export async function getAdminHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await requireRole(...ADMIN_ROLES);

  const { id } = idParamSchema.parse(await context.params);
  const admin = await getAdminByIdService(id);

  return successResponse(admin);
}

export async function updateAdminHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = idParamSchema.parse(await context.params);
  const body = updateAdminSchema.parse(await request.json());
  const admin = await updateAdminService(session.user.id, id, body);

  return successResponse(admin);
}

// Only a super admin can revoke another admin's access.
export async function deleteAdminHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("SUPER_ADMIN");

  const { id } = idParamSchema.parse(await context.params);
  await deleteAdminService(session, id);

  return successResponse({ id });
}
