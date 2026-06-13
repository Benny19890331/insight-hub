import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 * AI 報表教練：讀取報表數據，用溫暖鼓勵的語氣給予肯定與輕量建議。
 * 設計原則：讚美優先、絕不施壓，讓看報表變成被打氣而不是被檢討。
 *
 * 上次的建議會用 localStorage 保留在本機（換裝置或清資料就會消失）。
 */

const STORAGE_KEY = "report-coach-last-result";
const STORAGE_AT = "report-coach-last-at";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "剛剛";
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

interface Props {
  stats: any;
  /** 僅供展示/測試用：直接顯示給定文字、不呼叫 AI */
  demoResult?: string;
}

export function ReportCoachCard({ stats, demoResult }: Props) {
  const { theme: t } = useTheme();
  const [result, setResult] = useState<string>(() => {
    if (demoResult) return demoResult;
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [lastAt, setLastAt] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_AT) ?? "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);

  const askCoach = async () => {
    setLoading(true);
    try {
      const compact = {
        名單總數: stats.total,
        本月新增: stats.newThisMonth,
        本月互動次數: stats.interactionsThisMonth,
        平均互動次數: stats.avgInteractions,
        待追蹤數: stats.followUpDue,
        本月壽星數: stats.birthdayList?.length ?? 0,
        熱度分佈: (stats.heatData ?? []).map((h: any) => ({ 熱度: h.name, 人數: h.value })),
        地區分佈前三: (stats.regionData ?? []).slice(0, 3).map((r: any) => ({ 地區: r.name, 人數: r.value })),
        近月趨勢: (stats.trendData ?? []).slice(-4),
      };
      const { data, error } = await supabase.functions.invoke("report-coach", {
        body: { stats: compact },
      });
      if (error || !data?.result) {
        toast.error("教練暫時連不上線，請稍後再試");
        return;
      }
      setResult(data.result);
      const now = new Date().toISOString();
      setLastAt(now);
      try {
        localStorage.setItem(STORAGE_KEY, data.result);
        localStorage.setItem(STORAGE_AT, now);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="relative rounded-xl p-[1.5px] overflow-hidden"
      style={{ background: "linear-gradient(120deg, #f9a8d4, #fbbf24, #6ee7b7, #f9a8d4)", backgroundSize: "300% 300%", animation: "rainbow-bg 10s linear infinite" }}
    >
      <div className={`rounded-[11px] p-4 md:p-5 ${t.cardBg ?? "bg-card"}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: t.titleColor }}>
            <Sparkles className="h-4 w-4 text-amber-400" /> AI 教練的悄悄話
          </h2>
          {result && !loading && (
            <button onClick={askCoach}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="h-3 w-3" /> 再聽一次
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            教練正在看你的努力成果⋯
          </div>
        ) : result ? (
          <div className="space-y-2.5">
            {result.split(/\n+/).filter(Boolean).map((para, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/90">{para}</p>
            ))}
            {lastAt && (
              <p className="text-[11px] text-muted-foreground pt-1">上次更新於 {timeAgo(lastAt)}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground text-center">
              讓 AI 教練看看你最近的經營成果，<br className="md:hidden" />給你一些暖心的回饋和小方向 💪
            </p>
            <button onClick={askCoach}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500/20 via-amber-500/20 to-emerald-500/20 border border-amber-400/40 px-5 py-2 text-sm font-medium text-foreground hover:brightness-125 transition-all">
              <Sparkles className="h-4 w-4 text-amber-400" /> 請教練幫我看看
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
