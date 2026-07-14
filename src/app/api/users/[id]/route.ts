import { withErrorHandling } from "@/core/api/handler";
import {
  adminUpdateUserHandler,
  deactivateUserHandler,
  getUserHandler,
} from "@/features/users/routes/user.routes";

export const GET = withErrorHandling(getUserHandler);
export const PATCH = withErrorHandling(adminUpdateUserHandler);
export const DELETE = withErrorHandling(deactivateUserHandler);
