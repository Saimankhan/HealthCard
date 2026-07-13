import { withErrorHandling } from "@/core/api/handler";
import { listUsersHandler } from "@/features/users/routes/user.routes";

export const GET = withErrorHandling(listUsersHandler);
