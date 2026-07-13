import type { NextRequest } from "next/server";

import { requireRole, requireSession } from "@/core/auth/rbac";
import { ADMIN_ROLES } from "@/core/auth/roles";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import {
  issueHealthCardSchema,
  listHealthCardsQuerySchema,
  updateHealthCardStatusSchema,
} from "@/features/healthcard/validation/health-card.validation";
import {
  getHealthCardByIdService,
  getOwnHealthCardService,
  issueHealthCardService,
  listHealthCardsService,
  updateHealthCardStatusService,
  verifyHealthCardByTokenService,
} from "@/features/healthcard/services/health-card.service";

export async function listHealthCardsHandler(request: NextRequest) {
  await requireRole(...ADMIN_ROLES);

  const query = listHealthCardsQuerySchema.parse(
    parseSearchParams(request.url)
  );
  const { items, meta } = await listHealthCardsService(query);

  return successResponse(items, { meta });
}

export async function issueHealthCardHandler(request: NextRequest) {
  const session = await requireRole(...ADMIN_ROLES);

  const body = issueHealthCardSchema.parse(await request.json());
  const card = await issueHealthCardService(session.user.id, body);

  return successResponse(card, { status: 201 });
}

export async function getOwnHealthCardHandler(_request: NextRequest) {
  const session = await requireRole("PATIENT");
  const card = await getOwnHealthCardService(session);
  return successResponse(card);
}

export async function getHealthCardHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const card = await getHealthCardByIdService(session, id);

  return successResponse(card);
}

export async function verifyHealthCardHandler(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  await requireRole(...ADMIN_ROLES, "DOCTOR");

  const { token } = await context.params;
  const card = await verifyHealthCardByTokenService(token);

  return successResponse(card);
}

export async function updateHealthCardStatusHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = idParamSchema.parse(await context.params);
  const body = updateHealthCardStatusSchema.parse(await request.json());
  const card = await updateHealthCardStatusService(
    session.user.id,
    id,
    body.status
  );

  return successResponse(card);
}
