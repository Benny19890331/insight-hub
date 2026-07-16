import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthResult = { data?: { redirect_url?: string; redirect_to?: string; client?: { name?: string }; scopes?: string[] } | null; error?: { message: string } | null };
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
    approveAuthorization: (id: string) => Promise<OAuthResult>;
    denyAuthorization: (id: string) => Promise<OAuthResult>;
  };
}).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthResult["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) { setError("缺少 authorization_id 參數"); return; }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setAccount(sess.session.user.email ?? sess.session.user.id);
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) { setError(error.message); return; }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) { window.location.href = immediate; return; }
      setDetails(data ?? null);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("授權伺服器未回傳導向網址"); return; }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 space-y-3 text-card-foreground">
          <h1 className="text-lg font-semibold">無法載入授權請求</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        載入中⋯
      </main>
    );
  }

  const clientName = details.client?.name ?? "外部應用";

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 space-y-5 text-card-foreground shadow-xl">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">將 {clientName} 連接到 RICH 系統</h1>
          <p className="text-sm text-muted-foreground">
            以 <span className="font-medium text-foreground">{account}</span> 身分授權。
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
          <p>{clientName} 將能在你登入期間使用本 App 提供的 MCP 工具，代表你操作：</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>讀取你的聯絡人與互動紀錄</li>
            <li>為你新增互動紀錄</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-1">
            此授權不會繞過 RICH 系統的權限與後端政策，僅能存取你自己的資料。
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "處理中⋯" : "允許連接"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            拒絕
          </button>
        </div>
      </div>
    </main>
  );
}
