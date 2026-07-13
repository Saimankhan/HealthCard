import { withErrorHandling } from "@/core/api/handler";
import { getOwnPatientProfileHandler } from "@/features/patients/routes/patient.routes";

export const GET = withErrorHandling(getOwnPatientProfileHandler);
