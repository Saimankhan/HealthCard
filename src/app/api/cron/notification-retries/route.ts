import type { NextRequest } from "next/server";

import { withErrorHandling } from "@/core/api/handler";
import { successResponse } from "@/core/api/response";
import { assertCronAuth } from "@/core/security/cron-auth";
import { retryFailedNotificationsService } from "@/features/notifications/services/notification.service";

async function handler(request: NextRequest) {
  assertCronAuth(request);
  const result = await retryFailedNotificationsService();
  return successResponse(result);
}

export const GET = withErrorHandling(handler);
export const POST = withErrorHandling(handler);
