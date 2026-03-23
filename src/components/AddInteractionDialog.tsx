import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Contact, Interaction } from "@/data/contacts";
import { MentionTextarea } from "@/components/MentionTextarea";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import bgGirl from "@/assets/bg-girl.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const bgImages = [bgGirl, bgYouth, bgPrime, bgWisdom];

interface AddInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contacts?: Contact[];
  onSave: (interaction: Interaction) => void;
}

export function AddInteractionDialog({ open, onOpenChange, contactName, contacts = [], onSave }: AddInteractionDialogProps) {
  const { theme: t, themeIndex } = useTheme();
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);

  // Reset date to today whenever dialog opens
  const prevOpen = useRef(false);
  if (open && !prevOpen.current) {
    const now = new Date().toISOString().split("T")[0];
    if (date !== now) setDate(now);
  }
  prevOpen.current = open;
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
      <DialogContent className="max-w-md overflow-hidden p-0 border-0 bg-transparent !top-[2dvh] !translate-y-0 sm:!top-[50%] sm:!translate-y-[-50%] [&>button]:z-30 [&>button]:bg-black/50 [&>button]:rounded-full [&>button]:p-1" style={{ maxHeight: '96dvh' }} onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="relative overflow-hidden rounded-lg h-full">
          {/* Background image */}
          <div className="absolute inset-0 overflow-hidden">
            <img src={bgImages[themeIndex]} alt="" className="absolute inset-0 w-full h-full object-cover bg-animate-drift" />
            <div className={`absolute inset-0 ${themeIndex === 0 ? '' : 'bg-black/60'}`} />
          </div>
          <div className="relative z-10 p-6 pt-10 pb-20 overflow-y-auto overscroll-contain" style={{ maxHeight: '96dvh', WebkitOverflowScrolling: 'touch' }}>
            <DialogHeader>
              <DialogTitle className="text-foreground">新增互動紀錄</DialogTitle>
              <DialogDescription>為 {contactName} 記錄一筆新的互動</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* AI Voice Input */}
              <div className="flex justify-center py-2 border-b border-border/50 mb-2">
                <VoiceInputButton
                  mode="interaction"
                  onResult={(data: any) => {
                    if (data.date) setDate(data.date);
                    if (data.summary) setSummary(data.summary);
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">日期</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
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
                <button onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                  取消
                </button>
                <button onClick={handleSave} className="neon-btn-cyan">
                  儲存紀錄
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
