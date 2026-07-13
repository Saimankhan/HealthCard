import { z } from "zod";

// Our own domain entities use Prisma's `@default(uuid())`.
export const entityIdSchema = z.string().uuid("Invalid id format");

// Better Auth generates its own (non-UUID) ids for User/Session/Account rows.
export const userIdSchema = z.string().trim().min(1, "Invalid user id");

export const idParamSchema = z.object({
  id: entityIdSchema,
});

export type IdParam = z.infer<typeof idParamSchema>;
