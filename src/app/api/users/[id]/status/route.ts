import { withErrorHandling } from "@/core/api/handler";
import { updateUserStatusHandler } from "@/features/users/routes/user.routes";

export const PATCH = withErrorHandling(updateUserStatusHandler);
