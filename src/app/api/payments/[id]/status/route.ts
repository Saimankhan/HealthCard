import { withErrorHandling } from "@/core/api/handler";
import { updatePaymentStatusHandler } from "@/features/payments/routes/payment.routes";

export const PATCH = withErrorHandling(updatePaymentStatusHandler);
