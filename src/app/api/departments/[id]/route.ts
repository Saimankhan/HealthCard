import { withErrorHandling } from "@/core/api/handler";
import {
  deleteDepartmentHandler,
  updateDepartmentHandler,
} from "@/features/departments/routes/department.routes";

export const PATCH = withErrorHandling(updateDepartmentHandler);
export const DELETE = withErrorHandling(deleteDepartmentHandler);
