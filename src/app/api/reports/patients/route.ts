import { withErrorHandling } from "@/core/api/handler";
import { getPatientReportHandler } from "@/features/reports/routes/report.routes";

export const GET = withErrorHandling(getPatientReportHandler);
