export interface PageResult<T> {
  data: T[] | null;
  error: { message?: string } | null;
}

export interface FetchAllPagesOptions {
  pageSize?: number;
  maxRows?: number;
  label?: string;
}

export class PaginationLimitError extends Error {
  constructor(label: string, maxRows: number) {
    super(`${label}超過目前安全上限 ${maxRows.toLocaleString()} 筆，已停止處理以避免只處理部分資料`);
    this.name = "PaginationLimitError";
  }
}

/**
 * Fetch every row from a Supabase query in deterministic pages.
 *
 * Supabase REST responses are commonly capped at 1,000 rows. Callers that
 * silently use a single select() will therefore miss records once a list grows.
 * This helper also probes one row past maxRows so a limit is never mistaken for
 * a complete result.
 */
export async function fetchAllPages<T>(
  queryPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  options: FetchAllPagesOptions = {},
): Promise<T[]> {
  const pageSize = options.pageSize ?? 1000;
  const maxRows = options.maxRows ?? 100_000;
  const label = options.label ?? "資料量";

  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error("pageSize 必須是正整數");
  }
  if (!Number.isInteger(maxRows) || maxRows <= 0) {
    throw new Error("maxRows 必須是正整數");
  }

  const all: T[] = [];

  while (all.length < maxRows) {
    const from = all.length;
    const to = Math.min(from + pageSize - 1, maxRows - 1);
    const { data, error } = await queryPage(from, to);

    if (error) {
      throw new Error(error.message || `${label}讀取失敗`);
    }

    const page = data ?? [];
    all.push(...page);

    if (page.length < to - from + 1) {
      return all;
    }
  }

  // Do not silently truncate at maxRows. Probe the following row so an exact
  // maxRows-sized data set can still be treated as complete.
  const { data: overflow, error } = await queryPage(maxRows, maxRows);
  if (error) {
    throw new Error(error.message || `${label}上限檢查失敗`);
  }
  if ((overflow ?? []).length > 0) {
    throw new PaginationLimitError(label, maxRows);
  }

  return all;
}
