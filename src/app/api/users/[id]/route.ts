import { withErrorHandling } from "@/core/api/handler";
import {
  deactivateUserHandler,
  getUserHandler,
} from "@/features/users/routes/user.routes";

export const GET = withErrorHandling(getUserHandler);
export const DELETE = withErrorHandling(deactivateUserHandler);
