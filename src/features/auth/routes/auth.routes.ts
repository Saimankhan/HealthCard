import type { NextRequest } from "next/server";

import { requireSession } from "@/core/auth/rbac";
import { successResponse } from "@/core/api/response";

export async function getCurrentUserHandler(_request: NextRequest) {
  const session = await requireSession();
  return successResponse(session.user);
}
