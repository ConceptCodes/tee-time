import type { Context } from "hono";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export type PaginationParams = {
  limit: number;
  offset: number;
};

export const parsePagination = (c: Context): PaginationParams | null => {
  const limitParam = c.req.query("limit");
  const offsetParam = c.req.query("offset");
  const limit = limitParam ? Number(limitParam) : DEFAULT_LIMIT;
  const offset = offsetParam ? Number(offsetParam) : 0;
  if (Number.isNaN(limit) || Number.isNaN(offset) || limit < 1 || offset < 0) {
    return null;
  }
  return {
    limit: Math.min(limit, MAX_LIMIT),
    offset
  };
};

export const paginatedResponse = <T>(
  data: T[],
  pagination: PaginationParams,
  total?: number
) => ({
  data,
  meta: {
    limit: pagination.limit,
    offset: pagination.offset,
    ...(total !== undefined ? { total } : {})
  }
});
