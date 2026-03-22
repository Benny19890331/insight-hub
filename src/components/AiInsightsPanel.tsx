
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/data/contacts";
import { useTheme } from "@/hooks/useTheme";
import { Brain, RefreshCw, Loader2, Lightbulb, Tags, ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";

interface Insights {
  summary: string;
  tags: string[];
  next_action: string;
}

interface Props {
  contact: Contact;
}

export function AiInsightsPanel({ contact }: Props) {
  const { theme: t } = useTheme();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStored, setLoadingStored] = useState(true);

  // Load stored insights
  useEffect(() => {
    setLoadingStored(true);
    supabase
      .from("contact_insights" as any)
      .select("summary, tags, next_action")
      .eq("contact_id", contact.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setInsights(data as unknown as Insights);
        } else {
          setInsights(null);
        }
        setLoadingStored(false);
      });
  }, [contact.id]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("contact-insights", {
        body: { contact_id: contact.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsights(data as Insights);
      toast.success("C單分析完成！");
    } catch (e: any) {
      toast.error(e.message || "分析失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  if (loadingStored) return null;

  const tagColors = [
    "bg-violet-500/15 text-violet-300 border-violet-500/30",
    "bg-sky-500/15 text-sky-300 border-sky-500/30",
    "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    "bg-amber-500/15 text-amber-300 border-amber-500/30",
    "bg-rose-500/15 text-rose-300 border-rose-500/30",
    "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  ];

  return (
    <div className="space-y-3">
      {/* Generate / Regenerate button */}
      {!insights && !loading && (
        <button
          onClick={generate}
          className="w-full flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: `linear-gradient(135deg, ${t.titleColor}22, ${t.titleColor}08)`,
            borderColor: `${t.titleColor}44`,
            color: t.titleColor,
            boxShadow: `0 0 20px -6px ${t.titleColor}33`,
          }}
        >
          <Brain className="h-4.5 w-4.5" />
          AI 提煉 C單（分析報告）
        </button>
      )}

      {loading && (
        <div
          className="flex items-center justify-center gap-2 rounded-xl border px-4 py-6 text-sm"
          style={{
            background: `linear-gradient(135deg, ${t.titleColor}15, ${t.titleColor}05)`,
            borderColor: `${t.titleColor}30`,
            color: t.titleColor,
          }}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>AI 正在分析客戶資料⋯</span>
        </div>
      )}

      {insights && !loading && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${t.titleColor}10, transparent)`,
            borderColor: `${t.titleColor}30`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: `${t.titleColor}20` }}>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" style={{ color: t.titleColor }} />
              <span className="text-xs font-semibold tracking-wide" style={{ color: t.titleColor }}>AI 分析報告(C單)</span>
            </div>
            <button
              onClick={generate}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-colors hover:bg-white/10"
              style={{ color: t.titleColor }}
            >
              <RefreshCw className="h-3 w-3" />重新生成
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Summary */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" style={{ color: t.titleColor }} />
                狀態總結
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{insights.summary}</p>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Tags className="h-3.5 w-3.5" style={{ color: t.titleColor }} />
                客戶標籤
              </div>
              <div className="flex flex-wrap gap-1.5">
                {insights.tags.map((tag, i) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tagColors[i % tagColors.length]}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Next action */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowRight className="h-3.5 w-3.5" style={{ color: t.titleColor }} />
                下一步行動
              </div>
              <div
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  background: `${t.titleColor}08`,
                  borderColor: `${t.titleColor}25`,
                }}
              >
                {insights.next_action}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
