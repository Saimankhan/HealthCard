import { withErrorHandling } from "@/core/api/handler";
import { verifyHealthCardHandler } from "@/features/healthcard/routes/health-card.routes";

export const GET = withErrorHandling(verifyHealthCardHandler);
