import type { Json } from "@/integrations/supabase/types";

export interface ContactMergeRpcResult {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed" | "canceled";
  merged: number;
  groups: number;
  totalContacts: number;
  duplicateContacts: number;
  error?: string;
  mode?: string;
}

export function parseContactMergeRpcResult(value: Json | null): ContactMergeRpcResult {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("資料庫回傳了無法辨識的合併結果");
  }

  const result = value as Record<string, Json | undefined>;
  const status = String(result.status ?? "queued") as ContactMergeRpcResult["status"];
  if (!["queued", "running", "completed", "failed", "canceled"].includes(status)) {
    throw new Error("資料庫回傳了未知的合併狀態");
  }

  const jobId = typeof result.job_id === "string" ? result.job_id : "";
  if (!jobId) throw new Error("合併工作缺少識別碼，請稍後再試");

  const toCount = (input: Json | undefined): number => {
    const count = Number(input ?? 0);
    return Number.isFinite(count) && count >= 0 ? count : 0;
  };

  return {
    jobId,
    status,
    merged: toCount(result.merged),
    groups: toCount(result.groups ?? result.duplicate_groups),
    totalContacts: toCount(result.total_contacts),
    duplicateContacts: toCount(result.duplicate_contacts),
    error: typeof result.error === "string" ? result.error : undefined,
    mode: typeof result.mode === "string" ? result.mode : undefined,
  };
}

export function isMissingMergeRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST202"
    || /could not find the function.+(?:create_contact_merge_job|run_contact_merge_job)/i.test(error.message ?? "");
}
