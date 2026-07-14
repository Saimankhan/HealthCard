import { withErrorHandling } from "@/core/api/handler";
import { createCheckoutSessionHandler } from "@/features/payments/routes/payment.routes";

export const POST = withErrorHandling(createCheckoutSessionHandler);
