import { withErrorHandling } from "@/core/api/handler";
import { getHealthCardQrHandler } from "@/features/healthcard/routes/health-card.routes";

export const GET = withErrorHandling(getHealthCardQrHandler);
