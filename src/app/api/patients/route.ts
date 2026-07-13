import { withErrorHandling } from "@/core/api/handler";
import {
  createPatientHandler,
  listPatientsHandler,
} from "@/features/patients/routes/patient.routes";

export const GET = withErrorHandling(listPatientsHandler);
export const POST = withErrorHandling(createPatientHandler);
