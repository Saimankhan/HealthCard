import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { entityIdSchema } from "@/core/api/schemas";

export const createMedicalHistorySchema = z.object({
  patientId: entityIdSchema,
  condition: z.string().trim().min(1).max(200),
  diagnosis: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  recordedAt: z.coerce.date().optional(),
});

export const updateMedicalHistorySchema = z.object({
  condition: z.string().trim().min(1).max(200).optional(),
  diagnosis: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const listMedicalHistoryQuerySchema = paginationQuerySchema.extend({
  patientId: entityIdSchema.optional(),
  doctorId: entityIdSchema.optional(),
});

export type CreateMedicalHistoryInput = z.infer<
  typeof createMedicalHistorySchema
>;
export type UpdateMedicalHistoryInput = z.infer<
  typeof updateMedicalHistorySchema
>;
export type ListMedicalHistoryQuery = z.infer<
  typeof listMedicalHistoryQuerySchema
>;
