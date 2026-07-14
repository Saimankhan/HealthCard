import { withErrorHandling } from "@/core/api/handler";
import { getPaymentReportHandler } from "@/features/reports/routes/report.routes";

export const GET = withErrorHandling(getPaymentReportHandler);
