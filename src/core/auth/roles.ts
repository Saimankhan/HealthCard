export const ROLES = ["PATIENT", "DOCTOR", "ADMIN", "SUPER_ADMIN"] as const;

export type Role = (typeof ROLES)[number];

/** Roles with administrative (back-office) access. SUPER_ADMIN is a superset of ADMIN. */
export const ADMIN_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
] as const satisfies readonly Role[];

// Accepts `string` (not just `Role`) because Better Auth's session typing
// only knows `role` as a plain string via additionalFields.
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
