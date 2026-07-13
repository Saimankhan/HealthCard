import { withErrorHandling } from "@/core/api/handler";
import { requestAvatarUploadUrlHandler } from "@/features/users/routes/user.routes";

export const POST = withErrorHandling(requestAvatarUploadUrlHandler);
