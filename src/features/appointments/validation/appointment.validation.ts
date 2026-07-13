import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { entityIdSchema } from "@/core/api/schemas";

const appointmentStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const createAppointmentSchema = z.object({
  doctorId: entityIdSchema,
  patientId: entityIdSchema.optional(),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(10).max(240).default(30),
  reason: z.string().trim().max(500).optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: appointmentStatusSchema,
});

export const rescheduleAppointmentSchema = z.object({
  scheduledAt: z.coerce.date(),
});

export const listAppointmentsQuerySchema = paginationQuerySchema.extend({
  status: appointmentStatusSchema.optional(),
  patientId: entityIdSchema.optional(),
  doctorId: entityIdSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<
  typeof updateAppointmentStatusSchema
>;
export type RescheduleAppointmentInput = z.infer<
  typeof rescheduleAppointmentSchema
>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
