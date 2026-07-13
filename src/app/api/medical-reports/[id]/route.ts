import { withErrorHandling } from "@/core/api/handler";
import {
  deleteMedicalReportHandler,
  getMedicalReportHandler,
  updateMedicalReportHandler,
} from "@/features/medical-reports/routes/medical-report.routes";

export const GET = withErrorHandling(getMedicalReportHandler);
export const PATCH = withErrorHandling(updateMedicalReportHandler);
export const DELETE = withErrorHandling(deleteMedicalReportHandler);
