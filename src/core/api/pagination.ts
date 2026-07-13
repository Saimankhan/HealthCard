import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().trim().min(1).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function paginationSkipTake(
  query: Pick<PaginationQuery, "page" | "pageSize">
) {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}

export function paginationMeta(
  query: Pick<PaginationQuery, "page" | "pageSize">,
  total: number
) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export function parseSearchParams(url: string): Record<string, string> {
  const { searchParams } = new URL(url);
  return Object.fromEntries(searchParams.entries());
}
