import { withErrorHandling } from "@/core/api/handler";
import {
  createMedicalReportHandler,
  listMedicalReportsHandler,
} from "@/features/medical-reports/routes/medical-report.routes";

export const GET = withErrorHandling(listMedicalReportsHandler);
export const POST = withErrorHandling(createMedicalReportHandler);
