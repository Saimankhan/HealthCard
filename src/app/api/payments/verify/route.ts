import { withErrorHandling } from "@/core/api/handler";
import { verifyPaymentHandler } from "@/features/payments/routes/payment.routes";

export const GET = withErrorHandling(verifyPaymentHandler);
