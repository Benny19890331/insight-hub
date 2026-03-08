import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Contact } from "@/data/contacts";
import { Copy, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ContactInsights {
  summary: string;
  tags: string[];
  next_action: string;
}

interface AiInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  insights?: ContactInsights | null;
}

const AI_INVITE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-invite`;

export function AiInviteDialog({ open, onOpenChange, contact }: AiInviteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    // Abort previous request if any
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setDraft("");

    try {
      const resp = await fetch(AI_INVITE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ contact }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "AI 生成失敗" }));
        toast.error(err.error || "AI 生成失敗");
        setLoading(false);
        return;
      }

      if (!resp.body) {
        toast.error("AI 回應異常");
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setDraft(fullText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setDraft(fullText);
            }
          } catch { /* ignore */ }
        }
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
  }, [open, contact.id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      toast.success("已複製到剪貼簿");
    } catch {
      toast.error("複製失敗，請手動選取複製");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[hsl(290_80%_72%)]" />
            AI 客製化邀約草稿
          </DialogTitle>
          <DialogDescription>根據 {contact.name} 的完整資料，由 AI 即時生成</DialogDescription>
        </DialogHeader>

        {loading && !draft ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-[hsl(290_80%_72%)]" />
              <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-[hsl(290_80%_60%_/_0.15)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">AI 正在分析客戶資料...</p>
              <p className="text-xs text-muted-foreground mt-1">根據熱度、產品偏好與背景撰寫邀約</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
              {draft}
              {loading && <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-middle" />}
            </div>
            <div className="flex justify-end gap-2 flex-wrap">
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
              <button onClick={handleCopy} disabled={loading || !draft} className="neon-btn-magenta disabled:opacity-50">
                <Copy className="h-3.5 w-3.5" />
                複製到剪貼簿
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
