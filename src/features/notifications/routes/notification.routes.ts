import type { NextRequest } from "next/server";

import { requireRole, requireSession } from "@/core/auth/rbac";
import { ADMIN_ROLES } from "@/core/auth/roles";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { idParamSchema } from "@/core/api/schemas";
import {
  broadcastNotificationSchema,
  createNotificationSchema,
  listNotificationsQuerySchema,
} from "@/features/notifications/validation/notification.validation";
import {
  broadcastNotificationService,
  createNotificationService,
  listOwnNotificationsService,
  markAllNotificationsReadService,
  markNotificationReadService,
} from "@/features/notifications/services/notification.service";

export async function listOwnNotificationsHandler(request: NextRequest) {
  const session = await requireSession();

  const query = listNotificationsQuerySchema.parse(
    parseSearchParams(request.url)
  );
  const { items, meta } = await listOwnNotificationsService(session, query);

  return successResponse(items, { meta });
}

export async function createNotificationHandler(request: NextRequest) {
  await requireRole(...ADMIN_ROLES);

  const body = createNotificationSchema.parse(await request.json());
  const notification = await createNotificationService(body);

  return successResponse(notification, { status: 201 });
}

export async function markNotificationReadHandler(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();

  const { id } = idParamSchema.parse(await context.params);
  const notification = await markNotificationReadService(session, id);

  return successResponse(notification);
}

export async function markAllNotificationsReadHandler(_request: NextRequest) {
  const session = await requireSession();
  const result = await markAllNotificationsReadService(session);
  return successResponse({ updated: result.count });
}

export async function broadcastNotificationHandler(request: NextRequest) {
  await requireRole(...ADMIN_ROLES);

  const body = broadcastNotificationSchema.parse(await request.json());
  const result = await broadcastNotificationService(body);

  return successResponse({ sent: result.count }, { status: 201 });
}
