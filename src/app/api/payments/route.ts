import { withErrorHandling } from "@/core/api/handler";
import {
  createPaymentHandler,
  listPaymentsHandler,
} from "@/features/payments/routes/payment.routes";

export const GET = withErrorHandling(listPaymentsHandler);
export const POST = withErrorHandling(createPaymentHandler);
