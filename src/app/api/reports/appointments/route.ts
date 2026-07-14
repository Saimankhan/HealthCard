import { withErrorHandling } from "@/core/api/handler";
import { getAppointmentReportHandler } from "@/features/reports/routes/report.routes";

export const GET = withErrorHandling(getAppointmentReportHandler);
