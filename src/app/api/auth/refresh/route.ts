import { withErrorHandling } from "@/core/api/handler";
import { refreshSessionHandler } from "@/features/auth/routes/auth.routes";

export const GET = withErrorHandling(refreshSessionHandler);
