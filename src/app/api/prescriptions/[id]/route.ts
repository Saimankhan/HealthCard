import { withErrorHandling } from "@/core/api/handler";
import {
  deletePrescriptionHandler,
  getPrescriptionHandler,
  updatePrescriptionHandler,
} from "@/features/prescriptions/routes/prescription.routes";

export const GET = withErrorHandling(getPrescriptionHandler);
export const PATCH = withErrorHandling(updatePrescriptionHandler);
export const DELETE = withErrorHandling(deletePrescriptionHandler);
