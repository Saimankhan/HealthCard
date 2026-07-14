import { z } from "zod";

export const reportRangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
});

export type ReportRangeQuery = z.infer<typeof reportRangeQuerySchema>;
