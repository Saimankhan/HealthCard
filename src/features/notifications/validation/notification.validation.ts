import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { userIdSchema } from "@/core/api/schemas";
import { ROLES } from "@/core/auth/roles";

const notificationTypeSchema = z.enum([
  "APPOINTMENT_CONFIRMATION",
  "APPOINTMENT_REMINDER",
  "APPOINTMENT_CANCELLED",
  "APPOINTMENT_RESCHEDULED",
  "NEW_APPOINTMENT",
  "PRESCRIPTION_READY",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "MEDICAL_REPORT_READY",
  "SYSTEM_ANNOUNCEMENT",
  "GENERAL",
]);

export const createNotificationSchema = z.object({
  userId: userIdSchema,
  type: notificationTypeSchema.default("GENERAL"),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
});

export const broadcastNotificationSchema = z.object({
  role: z.enum(ROLES).optional(),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
});

export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  isRead: z.coerce.boolean().optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type BroadcastNotificationInput = z.infer<
  typeof broadcastNotificationSchema
>;
export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;
