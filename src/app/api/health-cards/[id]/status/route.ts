import { withErrorHandling } from "@/core/api/handler";
import { updateHealthCardStatusHandler } from "@/features/healthcard/routes/health-card.routes";

export const PATCH = withErrorHandling(updateHealthCardStatusHandler);
