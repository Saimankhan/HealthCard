import { withErrorHandling } from "@/core/api/handler";
import {
  deleteOwnAccountHandler,
  updateOwnProfileHandler,
} from "@/features/users/routes/user.routes";
import { getCurrentUserHandler } from "@/features/auth/routes/auth.routes";

export const GET = withErrorHandling(getCurrentUserHandler);
export const PATCH = withErrorHandling(updateOwnProfileHandler);
export const DELETE = withErrorHandling(deleteOwnAccountHandler);
