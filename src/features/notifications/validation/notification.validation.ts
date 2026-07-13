import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { userIdSchema } from "@/core/api/schemas";

const notificationTypeSchema = z.enum([
  "APPOINTMENT_CONFIRMATION",
  "APPOINTMENT_REMINDER",
  "APPOINTMENT_CANCELLED",
  "PRESCRIPTION_READY",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "MEDICAL_REPORT_READY",
  "GENERAL",
]);

export const createNotificationSchema = z.object({
  userId: userIdSchema,
  type: notificationTypeSchema.default("GENERAL"),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
});

export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  isRead: z.coerce.boolean().optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;
