import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { parseCardDiagnostics, buildNotesFromDiagnostics } from "@/lib/cardDiagnosticsParser";
import { supabase } from "@/integrations/supabase/client";
import type { HeatLevel } from "@/data/contacts";

export interface ParsedCardResult {
  name?: string;
  interest?: string;
  notes: string;
  heat: HeatLevel;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onParsed: (data: ParsedCardResult) => void;
}

export function PasteCardDiagnosticsDialog({ open, onOpenChange, onParsed }: Props) {
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);

  const handleParse = async () => {
    if (!raw.trim()) { toast.error("請貼上數位名片診斷結果內容"); return; }
    setLoading(true);
    try {
      const local = parseCardDiagnostics(raw);
      let aiSummary: string | undefined;
      let name = local.name;
      let type = local.type;
      let state = local.state;
      let heat: HeatLevel = local.heatGuess;

      // Always call AI for the 10-answer summary; also fills missing core fields
      try {
        const { data, error } = await supabase.functions.invoke("card-parse", {
          body: {
            raw,
            partial: { name: local.name, type: local.type, state: local.state },
          },
        });
        if (!error && data?.result) {
          const r = data.result;
          name = name || r.name;
          type = type || r.type;
          state = state || r.state;
          if (r.heat && ["cold","warm","hot","loyal"].includes(r.heat)) heat = r.heat;
          if (r.summary) aiSummary = r.summary;
        } else if (error) {
          console.warn("card-parse failed, using rules only:", error);
        }
      } catch (e) {
        console.warn("card-parse threw:", e);
      }

      const merged = { ...local, name, type, state };
      const notes = buildNotesFromDiagnostics(merged, aiSummary);
      const interest = local.interest;

      onParsed({ name, interest, notes, heat });
      toast.success("已帶入數位名片診斷結果，可再調整");
      setRaw("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setRaw(""); onOpenChange(v); }}>
      <DialogContent className="max-w-lg !top-[calc(env(safe-area-inset-top)+2dvh)] !translate-y-0 sm:!top-[50%] sm:!translate-y-[-50%]" style={{ maxHeight: 'calc(96dvh - env(safe-area-inset-top))' }}>
        <DialogHeader>
          <DialogTitle>📇 數位名片診斷結果</DialogTitle>
          <DialogDescription>把名片系統輸出的完整文字貼上，AI 會自動拆解填入欄位</DialogDescription>
        </DialogHeader>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="🧾【AI 風格診斷｜可直接貼】..."
          rows={12}
          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => { setRaw(""); onOpenChange(false); }} disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
            取消
          </button>
          <button onClick={handleParse} disabled={loading} className="neon-btn-cyan inline-flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            解析並帶入
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
