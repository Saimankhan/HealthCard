import "server-only";
import {
  createAuditLog,
  listAuditLogs,
} from "@/features/audit-logs/repository/audit-log.repository";
import { paginationMeta, paginationSkipTake } from "@/core/api/pagination";
import type { ListAuditLogsQuery } from "@/features/audit-logs/validation/audit-log.validation";

export const writeAuditLog = createAuditLog;

export async function listAuditLogsService(query: ListAuditLogsQuery) {
  const { skip, take } = paginationSkipTake(query);
  const { items, total } = await listAuditLogs({
    skip,
    take,
    sortOrder: query.sortOrder,
    entityType: query.entityType,
    actorId: query.actorId,
  });
  return { items, meta: paginationMeta(query, total) };
}
