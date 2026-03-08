import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Contact, Interaction } from "@/data/contacts";
import { MentionTextarea } from "@/components/MentionTextarea";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { toast } from "sonner";

interface AddInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contacts?: Contact[];
  onSave: (interaction: Interaction) => void;
}

export function AddInteractionDialog({ open, onOpenChange, contactName, contacts = [], onSave }: AddInteractionDialogProps) {
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
            <MentionTextarea
              value={summary}
              onChange={setSummary}
              contacts={contacts}
              placeholder="例如：一起喝咖啡，聊到健康話題⋯ 輸入 @ 可提及名單人物"
              rows={3}
              className="rounded-lg bg-muted/50"
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
