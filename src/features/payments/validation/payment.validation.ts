import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { entityIdSchema } from "@/core/api/schemas";

const paymentStatusSchema = z.enum([
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);
const paymentMethodSchema = z.enum(["CARD", "CASH", "INSURANCE"]);

export const createPaymentSchema = z.object({
  patientId: entityIdSchema,
  appointmentId: entityIdSchema.optional(),
  amount: z.coerce.number().positive().max(1_000_000),
  currency: z.string().trim().length(3).toLowerCase().default("usd"),
  method: paymentMethodSchema.default("CASH"),
});

export const updatePaymentStatusSchema = z.object({
  status: paymentStatusSchema,
});

export const refundPaymentSchema = z.object({
  amount: z.coerce.number().positive().optional(),
});

export const listPaymentsQuerySchema = paginationQuerySchema.extend({
  status: paymentStatusSchema.optional(),
  patientId: entityIdSchema.optional(),
  method: paymentMethodSchema.optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentStatusInput = z.infer<
  typeof updatePaymentStatusSchema
>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
