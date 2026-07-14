import { withErrorHandling } from "@/core/api/handler";
import { getDoctorReportHandler } from "@/features/reports/routes/report.routes";

export const GET = withErrorHandling(getDoctorReportHandler);
