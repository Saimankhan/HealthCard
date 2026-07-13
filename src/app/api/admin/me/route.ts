import { withErrorHandling } from "@/core/api/handler";
import { getOwnAdminProfileHandler } from "@/features/admin/routes/admin.routes";

export const GET = withErrorHandling(getOwnAdminProfileHandler);
