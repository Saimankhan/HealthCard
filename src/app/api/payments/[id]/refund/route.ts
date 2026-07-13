import { withErrorHandling } from "@/core/api/handler";
import { refundPaymentHandler } from "@/features/payments/routes/payment.routes";

export const POST = withErrorHandling(refundPaymentHandler);
