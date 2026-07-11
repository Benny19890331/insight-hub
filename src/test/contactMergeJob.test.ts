import { describe, expect, it } from "vitest";
import { isMissingMergeRpc, parseContactMergeRpcResult } from "@/lib/contactMergeJob";

describe("contact merge job responses", () => {
  it("parses a queued preview response", () => {
    expect(parseContactMergeRpcResult({
      job_id: "job-1",
      status: "queued",
      total_contacts: 20_005,
      duplicate_groups: 4_000,
      duplicate_contacts: 8_000,
    })).toEqual({
      jobId: "job-1",
      status: "queued",
      merged: 0,
      groups: 4_000,
      totalContacts: 20_005,
      duplicateContacts: 8_000,
      error: undefined,
      mode: undefined,
    });
  });

  it("parses a completed database transaction", () => {
    expect(parseContactMergeRpcResult({
      job_id: "job-2",
      status: "completed",
      merged: 8_000,
      groups: 4_000,
      total_contacts: 20_005,
      mode: "database_transaction",
    })).toMatchObject({
      jobId: "job-2",
      status: "completed",
      merged: 8_000,
      groups: 4_000,
      mode: "database_transaction",
    });
  });

  it("rejects malformed or unknown responses", () => {
    expect(() => parseContactMergeRpcResult(null)).toThrow("無法辨識");
    expect(() => parseContactMergeRpcResult({ status: "completed" })).toThrow("缺少識別碼");
    expect(() => parseContactMergeRpcResult({ job_id: "job-3", status: "mystery" })).toThrow("未知");
  });

  it("falls back only when PostgREST reports that the RPC is missing", () => {
    expect(isMissingMergeRpc({ code: "PGRST202", message: "missing" })).toBe(true);
    expect(isMissingMergeRpc({
      message: "Could not find the function public.create_contact_merge_job in the schema cache",
    })).toBe(true);
    expect(isMissingMergeRpc({
      code: "42501",
      message: "permission denied for function create_contact_merge_job",
    })).toBe(false);
  });
});
