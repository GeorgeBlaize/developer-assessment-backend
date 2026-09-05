export interface PaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface ParsedPagination {
  skip: number;
  take: number;
  page: number;
  limit: number;
  orderBy: Record<string, 'asc' | 'desc'>;
}

export const parsePagination = (
  query: PaginationQuery,
  defaultSortField = 'createdAt',
): ParsedPagination => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy || defaultSortField;
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  return {
    skip,
    take: limit,
    page,
    limit,
    orderBy: { [sortBy]: sortOrder },
  };
};

export const buildMeta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 0,
});
