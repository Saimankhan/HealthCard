import type { NextRequest } from "next/server";

import { withErrorHandling } from "@/core/api/handler";
import { errorResponse, successResponse } from "@/core/api/response";
import { prisma } from "@/core/db/prisma";

async function healthCheckHandler(_request: NextRequest) {
  try {
    await prisma.$connect();
    return successResponse({ status: "ok", db: "connected" });
  } catch (error) {
    return errorResponse((error as Error).message, 500, "DATABASE_ERROR");
  }
}

export const GET = withErrorHandling(healthCheckHandler);
