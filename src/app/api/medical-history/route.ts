import { withErrorHandling } from "@/core/api/handler";
import {
  createMedicalHistoryHandler,
  listMedicalHistoryHandler,
} from "@/features/medical-history/routes/medical-history.routes";

export const GET = withErrorHandling(listMedicalHistoryHandler);
export const POST = withErrorHandling(createMedicalHistoryHandler);
