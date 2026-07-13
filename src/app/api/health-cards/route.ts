import { withErrorHandling } from "@/core/api/handler";
import {
  issueHealthCardHandler,
  listHealthCardsHandler,
} from "@/features/healthcard/routes/health-card.routes";

export const GET = withErrorHandling(listHealthCardsHandler);
export const POST = withErrorHandling(issueHealthCardHandler);
