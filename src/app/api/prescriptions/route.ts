import { withErrorHandling } from "@/core/api/handler";
import {
  createPrescriptionHandler,
  listPrescriptionsHandler,
} from "@/features/prescriptions/routes/prescription.routes";

export const GET = withErrorHandling(listPrescriptionsHandler);
export const POST = withErrorHandling(createPrescriptionHandler);
