import { withErrorHandling } from "@/core/api/handler";
import { getDashboardOverviewHandler } from "@/features/reports/routes/report.routes";

export const GET = withErrorHandling(getDashboardOverviewHandler);
