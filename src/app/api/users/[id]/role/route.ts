import { withErrorHandling } from "@/core/api/handler";
import { updateUserRoleHandler } from "@/features/users/routes/user.routes";

export const PATCH = withErrorHandling(updateUserRoleHandler);
