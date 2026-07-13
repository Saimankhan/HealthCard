import { withErrorHandling } from "@/core/api/handler";
import {
  deleteAdminHandler,
  getAdminHandler,
  updateAdminHandler,
} from "@/features/admin/routes/admin.routes";

export const GET = withErrorHandling(getAdminHandler);
export const PATCH = withErrorHandling(updateAdminHandler);
export const DELETE = withErrorHandling(deleteAdminHandler);
