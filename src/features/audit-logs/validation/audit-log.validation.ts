import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { userIdSchema } from "@/core/api/schemas";

const auditActionSchema = z.enum([
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGE",
  "LOGIN",
  "LOGOUT",
]);

export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  entityType: z.string().trim().min(1).optional(),
  actorId: userIdSchema.optional(),
  action: auditActionSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
