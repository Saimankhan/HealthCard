import type { NextRequest } from "next/server";

import { requireRole, requireSession } from "@/core/auth/rbac";
import { ADMIN_ROLES } from "@/core/auth/roles";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
  refundPaymentSchema,
  updatePaymentStatusSchema,
} from "@/features/payments/validation/payment.validation";
import {
  createPaymentService,
  getPaymentByIdService,
  listPaymentsService,
  refundPaymentService,
  updatePaymentStatusService,
} from "@/features/payments/services/payment.service";

export async function listPaymentsHandler(request: NextRequest) {
  const session = await requireSession();

  const query = listPaymentsQuerySchema.parse(parseSearchParams(request.url));
  const { items, meta } = await listPaymentsService(session, query);

  return successResponse(items, { meta });
}

export async function createPaymentHandler(request: NextRequest) {
  const session = await requireRole(...ADMIN_ROLES);

  const body = createPaymentSchema.parse(await request.json());
  const payment = await createPaymentService(session.user.id, body);

  return successResponse(payment, { status: 201 });
}

export async function getPaymentHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const payment = await getPaymentByIdService(session, id);

  return successResponse(payment);
}

export async function updatePaymentStatusHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = idParamSchema.parse(await context.params);
  const body = updatePaymentStatusSchema.parse(await request.json());
  const payment = await updatePaymentStatusService(
    session.user.id,
    id,
    body.status
  );

  return successResponse(payment);
}

export async function refundPaymentHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(...ADMIN_ROLES);

  const { id } = idParamSchema.parse(await context.params);
  const body = refundPaymentSchema.parse(await request.json());
  const payment = await refundPaymentService(session.user.id, id, body);

  return successResponse(payment);
}
