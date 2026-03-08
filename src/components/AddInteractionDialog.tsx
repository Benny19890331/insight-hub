import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Interaction } from "@/data/contacts";
import { toast } from "sonner";

interface AddInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  onSave: (interaction: Interaction) => void;
}

export function AddInteractionDialog({ open, onOpenChange, contactName, onSave }: AddInteractionDialogProps) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [summary, setSummary] = useState("");

  const handleSave = () => {
    if (!summary.trim()) {
      toast.error("請輸入互動內容");
      return;
    }
    onSave({ date, summary: summary.trim() });
    setSummary("");
    setDate(today);
    onOpenChange(false);
    toast.success("互動紀錄已新增");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">新增互動紀錄</DialogTitle>
          <DialogDescription>為 {contactName} 記錄一筆新的互動</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">互動內容</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="例如：一起喝咖啡，聊到健康話題⋯"
              rows={3}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-surface-hover transition-colors">
              取消
            </button>
            <button onClick={handleSave} className="neon-btn-cyan">
              儲存紀錄
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
