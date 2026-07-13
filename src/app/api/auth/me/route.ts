import { withErrorHandling } from "@/core/api/handler";
import { getCurrentUserHandler } from "@/features/auth/routes/auth.routes";

export const GET = withErrorHandling(getCurrentUserHandler);
