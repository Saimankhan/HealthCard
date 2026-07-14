import type { NextRequest } from "next/server";

import { requireRole, requireSession } from "@/core/auth/rbac";
import { ADMIN_ROLES } from "@/core/auth/roles";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { userIdParamSchema } from "@/core/api/schemas";
import {
  confirmAvatarSchema,
  createUserSchema,
  listUsersQuerySchema,
  requestAvatarUploadUrlSchema,
  updateUserRoleSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from "@/features/users/validation/user.validation";
import {
  adminUpdateUserService,
  confirmAvatarService,
  createUserService,
  deactivateUserService,
  deleteOwnAccountService,
  getUserByIdService,
  listUsersService,
  requestAvatarUploadUrlService,
  updateOwnProfileService,
  updateUserRoleService,
  updateUserStatusService,
} from "@/features/users/services/user.service";

export async function listUsersHandler(request: NextRequest) {
  await requireRole(...ADMIN_ROLES);

  const query = listUsersQuerySchema.parse(parseSearchParams(request.url));
  const { items, meta } = await listUsersService(query);

  return successResponse(items, { meta });
}

export async function createUserHandler(request: NextRequest) {
  const session = await requireRole(...ADMIN_ROLES);

  const body = createUserSchema.parse(await request.json());
  const user = await createUserService(session.user.id, body);

  return successResponse(user, { status: 201 });
}

export async function updateUserStatusHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = userIdParamSchema.parse(await context.params);
  const body = updateUserStatusSchema.parse(await request.json());
  const user = await updateUserStatusService(session, id, body);

  return successResponse(user);
}

export async function getUserHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await requireRole(...ADMIN_ROLES);

  const { id } = userIdParamSchema.parse(await context.params);
  const user = await getUserByIdService(id);

  return successResponse(user);
}

export async function adminUpdateUserHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = userIdParamSchema.parse(await context.params);
  const body = updateUserSchema.parse(await request.json());
  const user = await adminUpdateUserService(session.user.id, id, body);

  return successResponse(user);
}

export async function updateUserRoleHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = userIdParamSchema.parse(await context.params);
  const body = updateUserRoleSchema.parse(await request.json());
  const user = await updateUserRoleService(session, id, body);

  return successResponse(user);
}

export async function deactivateUserHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = userIdParamSchema.parse(await context.params);
  const user = await deactivateUserService(session.user.id, id);

  return successResponse(user);
}

export async function updateOwnProfileHandler(request: NextRequest) {
  const session = await requireSession();

  const body = updateUserSchema.parse(await request.json());
  const user = await updateOwnProfileService(session.user.id, body);

  return successResponse(user);
}

export async function deleteOwnAccountHandler(_request: NextRequest) {
  const session = await requireSession();
  await deleteOwnAccountService(session);
  return successResponse({ id: session.user.id });
}

export async function requestAvatarUploadUrlHandler(request: NextRequest) {
  const session = await requireSession();

  const body = requestAvatarUploadUrlSchema.parse(await request.json());
  const result = await requestAvatarUploadUrlService(session, body);

  return successResponse(result);
}

export async function confirmAvatarHandler(request: NextRequest) {
  const session = await requireSession();

  const body = confirmAvatarSchema.parse(await request.json());
  const user = await confirmAvatarService(session, body);

  return successResponse(user);
}
