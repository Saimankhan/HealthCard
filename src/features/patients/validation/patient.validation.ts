import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { entityIdSchema, userIdSchema } from "@/core/api/schemas";

const genderSchema = z.enum(["MALE", "FEMALE", "OTHER"]);
const bloodGroupSchema = z.enum([
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
]);
const appointmentStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const createPatientSchema = z.object({
  userId: userIdSchema,
  dateOfBirth: z.coerce.date().optional(),
  gender: genderSchema.optional(),
  bloodGroup: bloodGroupSchema.optional(),
  phone: z.string().trim().min(5).max(20).optional(),
  address: z.string().trim().max(500).optional(),
  emergencyContactName: z.string().trim().max(120).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
});

export const updatePatientSchema = createPatientSchema
  .omit({ userId: true })
  .partial();

export const listPatientsQuerySchema = paginationQuerySchema.extend({
  gender: genderSchema.optional(),
  bloodGroup: bloodGroupSchema.optional(),
  phone: z.string().trim().min(1).optional(),
  healthCardNumber: z.string().trim().min(1).optional(),
  doctorId: entityIdSchema.optional(),
  appointmentStatus: appointmentStatusSchema.optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
