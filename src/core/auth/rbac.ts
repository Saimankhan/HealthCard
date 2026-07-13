import "server-only";
import { headers } from "next/headers";

import { auth } from "@/core/auth/auth";
import type { Role } from "@/core/auth/roles";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
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
