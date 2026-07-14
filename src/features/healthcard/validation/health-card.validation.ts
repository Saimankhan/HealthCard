import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { entityIdSchema } from "@/core/api/schemas";

const healthCardStatusSchema = z.enum(["ACTIVE", "EXPIRED", "REVOKED"]);

export const issueHealthCardSchema = z.object({
  patientId: entityIdSchema,
  expiresAt: z.coerce.date().optional(),
});

export const updateHealthCardStatusSchema = z.object({
  status: healthCardStatusSchema,
});

export const listHealthCardsQuerySchema = paginationQuerySchema.extend({
  status: healthCardStatusSchema.optional(),
});

export const reissueHealthCardSchema = z.object({
  newCardNumber: z.boolean().default(false),
  expiresAt: z.coerce.date().optional(),
});

export type IssueHealthCardInput = z.infer<typeof issueHealthCardSchema>;
export type UpdateHealthCardStatusInput = z.infer<
  typeof updateHealthCardStatusSchema
>;
export type ListHealthCardsQuery = z.infer<typeof listHealthCardsQuerySchema>;
export type ReissueHealthCardInput = z.infer<typeof reissueHealthCardSchema>;
