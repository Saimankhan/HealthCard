import type { NextRequest } from "next/server";

import { requireSession } from "@/core/auth/rbac";
import { successResponse } from "@/core/api/response";
import { getUserByIdService } from "@/features/users/services/user.service";

// Reads the User row fresh from the database rather than trusting
// `session.user`, which can be a stale snapshot for up to `cookieCache.maxAge`
// after a profile/avatar update (Better Auth caches the session, not just
// the token, to avoid a DB round trip on every request).
export async function getCurrentUserHandler(_request: NextRequest) {
  const session = await requireSession();
  const user = await getUserByIdService(session.user.id);
  return successResponse(user);
}

// Better Auth automatically extends the session (per `session.updateAge`)
// whenever it's read, so refreshing is just re-fetching the current session.
export async function refreshSessionHandler(_request: NextRequest) {
  const session = await requireSession();
  return successResponse(session);
}
