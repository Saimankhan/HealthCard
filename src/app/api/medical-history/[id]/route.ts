import { withErrorHandling } from "@/core/api/handler";
import {
  deleteMedicalHistoryHandler,
  getMedicalHistoryHandler,
  updateMedicalHistoryHandler,
} from "@/features/medical-history/routes/medical-history.routes";

export const GET = withErrorHandling(getMedicalHistoryHandler);
export const PATCH = withErrorHandling(updateMedicalHistoryHandler);
export const DELETE = withErrorHandling(deleteMedicalHistoryHandler);
