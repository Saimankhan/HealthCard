import { withErrorHandling } from "@/core/api/handler";
import { publicVerifyHealthCardHandler } from "@/features/healthcard/routes/health-card.routes";

export const GET = withErrorHandling(publicVerifyHealthCardHandler);
