import { withErrorHandling } from "@/core/api/handler";
import { getHealthCardHandler } from "@/features/healthcard/routes/health-card.routes";

export const GET = withErrorHandling(getHealthCardHandler);
