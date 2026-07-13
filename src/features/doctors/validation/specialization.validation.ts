import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";

export const createSpecializationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
});

export const updateSpecializationSchema = createSpecializationSchema.partial();

export const listSpecializationsQuerySchema = paginationQuerySchema;

export type CreateSpecializationInput = z.infer<
  typeof createSpecializationSchema
>;
export type UpdateSpecializationInput = z.infer<
  typeof updateSpecializationSchema
>;
export type ListSpecializationsQuery = z.infer<
  typeof listSpecializationsQuerySchema
>;
