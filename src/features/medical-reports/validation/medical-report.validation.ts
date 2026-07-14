import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { entityIdSchema } from "@/core/api/schemas";

const categorySchema = z.enum([
  "LAB_RESULT",
  "IMAGING",
  "DISCHARGE_SUMMARY",
  "PRESCRIPTION_SCAN",
  "OTHER",
]);

export const requestUploadUrlSchema = z.object({
  patientId: entityIdSchema,
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(150),
  fileSize: z.coerce.number().int().positive(),
});

export const createMedicalReportSchema = z.object({
  patientId: entityIdSchema,
  title: z.string().trim().min(1).max(200),
  category: categorySchema.default("OTHER"),
  fileKey: z.string().trim().min(1),
  fileType: z.string().trim().max(150).optional(),
  fileSize: z.coerce.number().int().positive().optional(),
});

export const updateMedicalReportSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  category: categorySchema.optional(),
  fileKey: z.string().trim().min(1).optional(),
  fileType: z.string().trim().max(150).optional(),
  fileSize: z.coerce.number().int().positive().optional(),
});

export const listMedicalReportsQuerySchema = paginationQuerySchema.extend({
  patientId: entityIdSchema.optional(),
  doctorId: entityIdSchema.optional(),
  category: categorySchema.optional(),
});

export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlSchema>;
export type CreateMedicalReportInput = z.infer<
  typeof createMedicalReportSchema
>;
export type UpdateMedicalReportInput = z.infer<
  typeof updateMedicalReportSchema
>;
export type ListMedicalReportsQuery = z.infer<
  typeof listMedicalReportsQuerySchema
>;
