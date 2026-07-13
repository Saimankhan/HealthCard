import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { entityIdSchema } from "@/core/api/schemas";

const medicationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dosage: z.string().trim().min(1).max(100),
  frequency: z.string().trim().min(1).max(100),
  durationDays: z.coerce.number().int().min(1).max(365).optional(),
});

export const createPrescriptionSchema = z.object({
  patientId: entityIdSchema,
  appointmentId: entityIdSchema.optional(),
  medications: z.array(medicationSchema).min(1),
  notes: z.string().trim().max(2000).optional(),
});

export const updatePrescriptionSchema = z.object({
  medications: z.array(medicationSchema).min(1).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const listPrescriptionsQuerySchema = paginationQuerySchema.extend({
  patientId: entityIdSchema.optional(),
  doctorId: entityIdSchema.optional(),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
export type ListPrescriptionsQuery = z.infer<
  typeof listPrescriptionsQuerySchema
>;
