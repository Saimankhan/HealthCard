import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { userIdSchema } from "@/core/api/schemas";

export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  entityType: z.string().trim().min(1).optional(),
  actorId: userIdSchema.optional(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
