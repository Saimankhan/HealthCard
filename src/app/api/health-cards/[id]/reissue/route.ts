import { withErrorHandling } from "@/core/api/handler";
import { reissueHealthCardHandler } from "@/features/healthcard/routes/health-card.routes";

export const POST = withErrorHandling(reissueHealthCardHandler);
