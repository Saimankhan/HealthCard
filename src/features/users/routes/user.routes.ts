import type { NextRequest } from "next/server";

import { requireRole } from "@/core/auth/rbac";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import {
  listUsersQuerySchema,
  updateUserRoleSchema,
} from "@/features/users/validation/user.validation";
import {
  deactivateUserService,
  getUserByIdService,
  listUsersService,
  updateUserRoleService,
} from "@/features/users/services/user.service";

export async function listUsersHandler(request: NextRequest) {
  await requireRole("ADMIN");

  const query = listUsersQuerySchema.parse(parseSearchParams(request.url));
  const { items, meta } = await listUsersService(query);

  return successResponse(items, { meta });
}

export async function getUserHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await requireRole("ADMIN");

  const { id } = idParamSchema.parse(await context.params);
  const user = await getUserByIdService(id);

  return successResponse(user);
}

export async function updateUserRoleHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("ADMIN");

  const { id } = idParamSchema.parse(await context.params);
  const body = updateUserRoleSchema.parse(await request.json());
  const user = await updateUserRoleService(session.user.id, id, body);

  return successResponse(user);
}

export async function deactivateUserHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("ADMIN");

  const { id } = idParamSchema.parse(await context.params);
  const user = await deactivateUserService(session.user.id, id);

  return successResponse(user);
}
