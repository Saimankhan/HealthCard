import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { entityIdSchema, userIdSchema } from "@/core/api/schemas";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format");

export const availabilitySlotSchema = z.object({
  day: z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]),
  startTime: timeSchema,
  endTime: timeSchema,
  isAvailable: z.boolean().default(true),
});

export const createDoctorSchema = z.object({
  userId: userIdSchema,
  licenseNumber: z.string().trim().min(3).max(50),
  bio: z.string().trim().max(1000).optional(),
  experienceYears: z.coerce.number().int().min(0).max(80).optional(),
  consultationFee: z.coerce.number().min(0).max(100000).optional(),
  phone: z.string().trim().min(5).max(20).optional(),
  specializationIds: z.array(entityIdSchema).optional(),
  availability: z.array(availabilitySlotSchema).max(7).optional(),
});

export const updateDoctorSchema = createDoctorSchema
  .omit({ userId: true, licenseNumber: true })
  .partial();

export const listDoctorsQuerySchema = paginationQuerySchema.extend({
  specializationId: entityIdSchema.optional(),
});

export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;
