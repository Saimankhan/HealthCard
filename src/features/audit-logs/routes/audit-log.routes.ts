import type { NextRequest } from "next/server";

import { requireRole } from "@/core/auth/rbac";
import { successResponse } from "@/core/api/response";
import { parseSearchParams } from "@/core/api/pagination";
import { listAuditLogsQuerySchema } from "@/features/audit-logs/validation/audit-log.validation";
import { listAuditLogsService } from "@/features/audit-logs/services/audit-log.service";

export async function listAuditLogsHandler(request: NextRequest) {
  await requireRole("ADMIN");

  const query = listAuditLogsQuerySchema.parse(parseSearchParams(request.url));
  const { items, meta } = await listAuditLogsService(query);

  return successResponse(items, { meta });
}
