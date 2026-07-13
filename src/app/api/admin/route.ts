import { withErrorHandling } from "@/core/api/handler";
import {
  createAdminHandler,
  listAdminsHandler,
} from "@/features/admin/routes/admin.routes";

export const GET = withErrorHandling(listAdminsHandler);
export const POST = withErrorHandling(createAdminHandler);
