import { withErrorHandling } from "@/core/api/handler";
import {
  deletePatientHandler,
  getPatientHandler,
  updatePatientHandler,
} from "@/features/patients/routes/patient.routes";

export const GET = withErrorHandling(getPatientHandler);
export const PATCH = withErrorHandling(updatePatientHandler);
export const DELETE = withErrorHandling(deletePatientHandler);
