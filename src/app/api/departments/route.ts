import { withErrorHandling } from "@/core/api/handler";
import {
  createDepartmentHandler,
  listDepartmentsHandler,
} from "@/features/departments/routes/department.routes";

export const GET = withErrorHandling(listDepartmentsHandler);
export const POST = withErrorHandling(createDepartmentHandler);
