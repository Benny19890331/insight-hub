import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Contact } from "@/data/contacts";
import { Copy, Sparkles, Loader2, RefreshCw, MessageSquareQuote } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import bgGirl from "@/assets/bg-girl.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgViolet from "@/assets/bg-violet.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const bgImages = [bgGirl, bgViolet, bgYouth, bgPrime, bgWisdom];

interface ContactInsights {
  summary: string;
  tags: string[];
  next_action: string;
}

interface InviteScript {
  tone: string;
  script: string;
}

interface AiInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  insights?: ContactInsights | null;
}

const AI_INVITE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-invite`;

export function AiInviteDialog({ open, onOpenChange, contact, insights }: AiInviteDialogProps) {
  const { themeIndex } = useTheme();
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<InviteScript[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setScripts([]);

    try {
      const resp = await fetch(AI_INVITE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ contact, insights: insights || null }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "AI 生成失敗" }));
        toast.error(err.error || "AI 生成失敗");
        return;
      }

      const data = await resp.json();
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const nextScripts = Array.isArray(data?.scripts) ? data.scripts : [];
      setScripts(nextScripts);
      if (nextScripts.length === 0) {
        toast.error("AI 未回傳邀約草稿，請按「重新生成」再試一次");
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("AI invite error:", e);
        toast.error("AI 生成失敗，請稍後再試");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      generate();
    }
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact.id]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`已複製「${label}」`);
    } catch {
      toast.error("複製失敗，請手動選取複製");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0 border-0 bg-transparent !top-[2dvh] !translate-y-0 sm:!top-[50%] sm:!translate-y-[-50%] [&>button]:z-30 [&>button]:bg-black/50 [&>button]:rounded-full [&>button]:p-1" style={{ maxHeight: '96dvh' }} onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="relative overflow-hidden rounded-lg h-full">
          <div className="absolute inset-0 overflow-hidden">
            <img src={bgImages[themeIndex]} alt="" className="absolute inset-0 w-full h-full object-cover bg-animate-drift" />
            <div className={`absolute inset-0 ${themeIndex <= 1 ? '' : 'bg-black/60'}`} />
          </div>
          <div className="relative z-10 p-6 pt-10 pb-6 overflow-y-auto overscroll-contain" style={{ maxHeight: '96dvh', WebkitOverflowScrolling: 'touch' }}>
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[hsl(290_80%_72%)]" />
                AI 客製化邀約草稿
              </DialogTitle>
              <DialogDescription>根據 {contact.name} 的完整資料，AI 生成三種語氣版本</DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-[hsl(290_80%_72%)]" />
                  <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-[hsl(290_80%_60%_/_0.15)]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">AI 正在分析客戶資料...</p>
                  <p className="text-xs text-muted-foreground mt-1">同時生成三種語氣版本</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-3">
                {scripts.length === 0 ? (
                  <div className="rounded-lg border border-border bg-black/20 backdrop-blur-sm p-4 text-sm text-muted-foreground text-center">
                    尚無內容，請按「重新生成」
                  </div>
                ) : (
                  scripts.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border bg-black/25 backdrop-blur-sm p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border border-[hsl(290_80%_72%_/_0.4)] bg-[hsl(290_80%_60%_/_0.15)] text-[hsl(290_80%_82%)]">
                          <MessageSquareQuote className="h-3 w-3" />
                          {s.tone}
                        </span>
                        <button
                          onClick={() => handleCopy(s.script, s.tone)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:bg-muted/30 transition-colors"
                        >
                          <Copy className="h-3 w-3" />複製
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                        {s.script}
                      </p>
                    </div>
                  ))
                )}
                <div className="flex justify-end gap-2 flex-wrap pt-1">
                  <button
                    onClick={generate}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    重新生成
                  </button>
                  <button onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                    關閉
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
