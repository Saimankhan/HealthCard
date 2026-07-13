import { withErrorHandling } from "@/core/api/handler";
import { listAuditLogsHandler } from "@/features/audit-logs/routes/audit-log.routes";

export const GET = withErrorHandling(listAuditLogsHandler);
