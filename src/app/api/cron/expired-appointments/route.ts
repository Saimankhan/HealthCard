import type { NextRequest } from "next/server";

import { withErrorHandling } from "@/core/api/handler";
import { successResponse } from "@/core/api/response";
import { assertCronAuth } from "@/core/security/cron-auth";
import { expireStaleAppointmentsService } from "@/features/appointments/services/appointment.service";

async function handler(request: NextRequest) {
  assertCronAuth(request);
  const result = await expireStaleAppointmentsService();
  return successResponse(result);
}

export const GET = withErrorHandling(handler);
export const POST = withErrorHandling(handler);
