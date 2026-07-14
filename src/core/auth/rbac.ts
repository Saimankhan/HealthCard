import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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

export async function requireSuperAdmin() {
  return requireRole("SUPER_ADMIN");
}

/**
 * Page-level (Server Component) equivalent of `requireRole`: redirects
 * instead of throwing, since layouts render HTML rather than JSON. Used by
 * the patient/doctor/admin route-group layouts to gate an entire subtree.
 */
export async function requirePageRole(...allowed: Role[]) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  const role = session.user.role as Role | null | undefined;
  if (!role || !allowed.includes(role)) {
    redirect("/");
  }
  return session;
}
