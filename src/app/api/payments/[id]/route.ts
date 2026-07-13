import { withErrorHandling } from "@/core/api/handler";
import { getPaymentHandler } from "@/features/payments/routes/payment.routes";

export const GET = withErrorHandling(getPaymentHandler);
