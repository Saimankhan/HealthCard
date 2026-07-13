import "server-only";
import { headers } from "next/headers";

import { auth } from "@/core/auth/auth";
import type { Role } from "@/core/auth/roles";
import { ForbiddenError, UnauthorizedError } from "@/core/api/errors";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

export async function requireRole(...allowed: Role[]) {
  const session = await requireSession();
  const role = session.user.role as Role | null | undefined;
  if (!role || !allowed.includes(role)) {
    throw new ForbiddenError();
  }
  return session;
}
