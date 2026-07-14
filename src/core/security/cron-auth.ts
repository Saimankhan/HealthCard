import "server-only";
import type { NextRequest } from "next/server";

import { serverEnv } from "@/core/config/env.server";
import { AppError, UnauthorizedError } from "@/core/api/errors";

/**
 * Shared guard for /api/cron/* routes. CRON_SECRET is optional at the env
 * level (local dev doesn't need scheduled jobs), but any deployment that
 * exposes these routes must set it — without it we refuse every call rather
 * than leaving the endpoint open.
 */
export function assertCronAuth(request: NextRequest): void {
  if (!serverEnv.CRON_SECRET) {
    throw new AppError("Cron secret is not configured", 501, "NOT_IMPLEMENTED");
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.CRON_SECRET}`) {
    throw new UnauthorizedError();
  }
}
