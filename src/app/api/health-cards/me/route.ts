import { withErrorHandling } from "@/core/api/handler";
import { getOwnHealthCardHandler } from "@/features/healthcard/routes/health-card.routes";

export const GET = withErrorHandling(getOwnHealthCardHandler);
