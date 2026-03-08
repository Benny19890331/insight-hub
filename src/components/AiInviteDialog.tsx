import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Contact } from "@/data/contacts";
import { Copy, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AiInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
}

function generateDraft(c: Contact): string {
  const greetings: Record<string, string> = {
    cold: `${c.name} 您好！我是透過朋友介紹認識您的。最近注意到您可能對健康養生有些興趣，想跟您分享一個很棒的機會。`,
    warm: `${c.name} 大哥/大姊您好！上次聊天非常開心，感覺您對我們的產品蠻有共鳴的。`,
    hot: `${c.name} 您好！之前看到您對我們的產品反應非常正面，我覺得這對您來說真的是很好的機會！`,
    loyal: `${c.name} 您好！感謝您一直以來的支持與愛用！您的好口碑已經幫我們帶來了不少新朋友。`,
  };

  const products = (c.productTags ?? []).length > 0
    ? `我知道您目前對「${c.productTags.join("」、「")}」特別感興趣，`
    : "我們有幾款非常受歡迎的產品，";

  const body = `${products}最近剛好有一場小型的產品分享體驗會，現場會有專業的健康顧問做一對一諮詢，完全免費、沒有任何壓力。`;

  const closing = c.heat === "cold"
    ? `如果您有空的話，歡迎帶家人一起來坐坐喝杯茶，就當認識新朋友。期待您的回覆！😊`
    : c.heat === "loyal"
    ? `另外，我們也很想跟您聊聊經銷夥伴的合作方案，我相信以您的人脈和口碑，一定能做得非常出色！期待跟您見面詳聊 🚀`
    : `時間地點都可以配合您的方便，週末或平日晚上都可以。期待您的回覆！🙌`;

  return `${greetings[c.heat]}\n\n${body}\n\n${closing}`;
}

export function AiInviteDialog({ open, onOpenChange, contact }: AiInviteDialogProps) {
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (open) {
      setLoading(true);
      setDraft("");
      const timer = setTimeout(() => {
        setDraft(generateDraft(contact));
        setLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [open, contact]);

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
          <DialogDescription>根據 {contact.name} 的狀態自動生成</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-[hsl(290_80%_72%)]" />
              <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-[hsl(290_80%_60%_/_0.15)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">AI 生成中...</p>
              <p className="text-xs text-muted-foreground mt-1">正在分析客戶資料並撰寫邀約</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
              {draft}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-surface-hover transition-colors">
                關閉
              </button>
              <button onClick={handleCopy} className="neon-btn-magenta">
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
