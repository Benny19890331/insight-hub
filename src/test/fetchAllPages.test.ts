import { describe, expect, it, vi } from "vitest";
import { fetchAllPages, PaginationLimitError } from "@/lib/fetchAllPages";

const makeQuery = (rows: number[]) => vi.fn(async (from: number, to: number) => ({
  data: rows.slice(from, to + 1),
  error: null,
}));

describe("fetchAllPages", () => {
  it("loads 4,500 rows instead of stopping at 1,000 or 3,000", async () => {
    const source = Array.from({ length: 4_500 }, (_, index) => index);
    const query = makeQuery(source);

    const result = await fetchAllPages(query, {
      pageSize: 1_000,
      maxRows: 10_000,
      label: "測試名單",
    });

    expect(result).toHaveLength(4_500);
    expect(result.at(-1)).toBe(4_499);
    expect(query).toHaveBeenCalledTimes(5);
  });

  it("accepts an exact maxRows-sized data set after probing for overflow", async () => {
    const source = Array.from({ length: 4_000 }, (_, index) => index);
    const result = await fetchAllPages(makeQuery(source), {
      pageSize: 1_000,
      maxRows: 4_000,
    });
    expect(result).toHaveLength(4_000);
  });

  it("throws instead of silently processing only part of an oversized set", async () => {
    const source = Array.from({ length: 4_001 }, (_, index) => index);
    await expect(fetchAllPages(makeQuery(source), {
      pageSize: 1_000,
      maxRows: 4_000,
      label: "名單",
    })).rejects.toBeInstanceOf(PaginationLimitError);
  });

  it("surfaces a page error", async () => {
    await expect(fetchAllPages(async () => ({
      data: null,
      error: { message: "database unavailable" },
    }))).rejects.toThrow("database unavailable");
  });
});
