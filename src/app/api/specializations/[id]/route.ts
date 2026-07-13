import { withErrorHandling } from "@/core/api/handler";
import {
  deleteSpecializationHandler,
  updateSpecializationHandler,
} from "@/features/doctors/routes/specialization.routes";

export const PATCH = withErrorHandling(updateSpecializationHandler);
export const DELETE = withErrorHandling(deleteSpecializationHandler);
