import type { NextRequest } from "next/server";

import { requireRole, requireSession } from "@/core/auth/rbac";
import { ADMIN_ROLES } from "@/core/auth/roles";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import {
  createDepartmentSchema,
  listDepartmentsQuerySchema,
  updateDepartmentSchema,
} from "@/features/departments/validation/department.validation";
import {
  createDepartmentService,
  deleteDepartmentService,
  listDepartmentsService,
  updateDepartmentService,
} from "@/features/departments/services/department.service";

export async function listDepartmentsHandler(request: NextRequest) {
  await requireSession();

  const query = listDepartmentsQuerySchema.parse(
    parseSearchParams(request.url)
  );
  const { items, meta } = await listDepartmentsService(query);

  return successResponse(items, { meta });
}

export async function createDepartmentHandler(request: NextRequest) {
  const session = await requireRole(...ADMIN_ROLES);

  const body = createDepartmentSchema.parse(await request.json());
  const department = await createDepartmentService(session.user.id, body);

  return successResponse(department, { status: 201 });
}

export async function updateDepartmentHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = idParamSchema.parse(await context.params);
  const body = updateDepartmentSchema.parse(await request.json());
  const department = await updateDepartmentService(session.user.id, id, body);

  return successResponse(department);
}

export async function deleteDepartmentHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = idParamSchema.parse(await context.params);
  await deleteDepartmentService(session.user.id, id);

  return successResponse({ id });
}
