import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { userIdSchema } from "@/core/api/schemas";

export const createAdminSchema = z.object({
  userId: userIdSchema,
  department: z.string().trim().min(1).max(120).optional(),
});

export const updateAdminSchema = createAdminSchema
  .omit({ userId: true })
  .partial();

export const listAdminsQuerySchema = paginationQuerySchema;

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type ListAdminsQuery = z.infer<typeof listAdminsQuerySchema>;
