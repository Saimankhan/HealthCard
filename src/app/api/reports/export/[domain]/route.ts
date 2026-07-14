import { withErrorHandling } from "@/core/api/handler";
import { exportReportHandler } from "@/features/reports/routes/report.routes";

export const GET = withErrorHandling(exportReportHandler);
