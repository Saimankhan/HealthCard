import { withErrorHandling } from "@/core/api/handler";
import { getOwnHealthCardQrHandler } from "@/features/healthcard/routes/health-card.routes";

export const GET = withErrorHandling(getOwnHealthCardQrHandler);
