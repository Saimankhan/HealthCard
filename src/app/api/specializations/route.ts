import { withErrorHandling } from "@/core/api/handler";
import {
  createSpecializationHandler,
  listSpecializationsHandler,
} from "@/features/doctors/routes/specialization.routes";

export const GET = withErrorHandling(listSpecializationsHandler);
export const POST = withErrorHandling(createSpecializationHandler);
