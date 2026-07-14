import { z } from "zod";

export const reportRangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
});

export const exportQuerySchema = z.object({
  format: z.enum(["csv", "pdf", "xlsx"]),
});

export type ReportRangeQuery = z.infer<typeof reportRangeQuerySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
