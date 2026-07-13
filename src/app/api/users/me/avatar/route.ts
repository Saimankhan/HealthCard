import { withErrorHandling } from "@/core/api/handler";
import { confirmAvatarHandler } from "@/features/users/routes/user.routes";

export const PATCH = withErrorHandling(confirmAvatarHandler);
