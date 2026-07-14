import { withErrorHandling } from "@/core/api/handler";
import {
  createUserHandler,
  listUsersHandler,
} from "@/features/users/routes/user.routes";

export const GET = withErrorHandling(listUsersHandler);
export const POST = withErrorHandling(createUserHandler);
