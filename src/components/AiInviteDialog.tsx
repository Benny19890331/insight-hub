import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Contact } from "@/data/contacts";
import { Copy, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface AiInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
}

// Gender-aware honorifics
function getHonorific(c: Contact): string {
  if (c.nickname) return c.nickname;
  if (c.gender === "female") return `${c.name} 姐`;
  if (c.gender === "male") return `${c.name} 哥`;
  return c.name;
}

function getTitle(c: Contact): string {
  if (c.gender === "female") return "姐";
  if (c.gender === "male") return "哥";
  return "";
}

// Rich greeting templates per heat level
const greetingTemplates: Record<string, ((c: Contact, hon: string) => string)[]> = {
  cold: [
    (c, hon) => `${hon} 您好！我是透過朋友認識您的，覺得您是一位很有質感的人，想找機會跟您認識交流一下 😊`,
    (c, hon) => `${hon} 您好！聽說您在${c.background || "專業領域"}很有經驗，我最近在做健康相關的事業，想跟您請教幾個問題，不知道方不方便？`,
    (c, hon) => `${hon}，您好呀！冒昧打擾您，我最近接觸到一個跟健康養生有關的好東西，想到您可能會有興趣，想簡單跟您分享一下 🙌`,
    (c, hon) => `嗨 ${hon}！朋友跟我提到您，說您是一位很注重生活品質的人。最近有個很棒的健康體驗活動，想邀請您一起來看看！`,
  ],
  warm: [
    (c, hon) => `${hon}${getTitle(c)}～上次聊天覺得跟您特別投緣！最近有些新的產品資訊想跟您更新一下，也想聽聽您的使用心得 😊`,
    (c, hon) => `${hon}～好久沒聯繫了！最近有一場很棒的小型體驗會，我第一個就想到您，想邀您一起來坐坐聊聊天 ☕`,
    (c, hon) => `Hi ${hon}！上回分享的那些資訊您有空看了嗎？最近我們有些新的活動跟方案，覺得很適合您，想跟您聊聊～`,
    (c, hon) => `${hon}${getTitle(c)}您好～之前跟您聊得很開心，我一直記得您對健康這塊蠻重視的。最近有個不錯的機會想跟您分享！`,
  ],
  hot: [
    (c, hon) => `${hon}${getTitle(c)}！上次您對我們產品的反應超好的，我覺得您真的很適合！這次有一個更深入的分享機會，想特別邀請您 🔥`,
    (c, hon) => `${hon}！我一直覺得像您這樣有眼光又有行動力的人，真的很難得。最近有一個很棒的合作方案，想第一時間跟您聊聊！`,
    (c, hon) => `${hon}～您上次的回饋讓我印象很深刻！我們團隊最近有一些新的進展，特別想跟您分享，也想聽聽您的想法 💡`,
    (c, hon) => `嗨 ${hon}！還記得上次您試用後的好評嗎？好多朋友聽了都很心動。最近有一場VIP專屬的體驗活動，名額有限，想第一個邀請您！`,
  ],
  loyal: [
    (c, hon) => `${hon}${getTitle(c)}！感謝您一直以來的支持跟好口碑，有您真的是我們最大的動力！這次有個特別的好消息想跟您分享 🚀`,
    (c, hon) => `${hon}～您真的是我們最珍貴的夥伴！最近團隊有一些新的發展方向，第一個想跟您討論，也想聽聽您的建議 💎`,
    (c, hon) => `親愛的${hon}${getTitle(c)}！一直很感謝您的愛用與推薦，您帶來的朋友們反應都很好。想跟您聊聊接下來我們可以一起做的更大的事！`,
    (c, hon) => `${hon}！您一直是我們最強的品牌大使 😄 最近有一個很棒的經銷夥伴方案升級，以您的人脈和口碑，絕對能更上一層樓！`,
  ],
};

// Product mention templates
function getProductMention(c: Contact): string {
  const tags = c.productTags ?? [];
  if (tags.length === 0) return "我們有幾款最近非常受歡迎的明星產品，";
  if (tags.length === 1) return `我知道您對「${tags[0]}」特別感興趣，`;
  if (tags.length === 2) return `您之前關注的「${tags[0]}」和「${tags[1]}」最近都有新的好消息，`;
  return `您關注的「${tags.slice(0, 2).join("」、「")}」等產品最近都有令人興奮的更新，`;
}

// Body templates
const bodyTemplates = [
  (prod: string) => `${prod}最近剛好有一場小型的產品分享體驗會，現場會有專業的健康顧問做一對一諮詢，完全免費、沒有任何壓力。`,
  (prod: string) => `${prod}我們這週末有一場輕鬆的下午茶分享會，可以實際體驗產品效果，氛圍很輕鬆，就像朋友聚會一樣 ☕`,
  (prod: string) => `${prod}我手邊有一些體驗裝，想說直接帶給您試試看最有感覺，找個時間我們約個咖啡聊聊？`,
  (prod: string) => `${prod}我想約您找個時間坐下來好好聊聊，可以針對您的需求做更深入的分析跟建議，完全沒有壓力的～`,
];

// Closing templates per heat level
const closingTemplates: Record<string, string[]> = {
  cold: [
    "如果您有空的話，歡迎帶家人一起來坐坐，就當認識新朋友。期待您的回覆！😊",
    "完全沒有壓力喔！就是輕鬆聊聊天、認識朋友。您方便的時間跟我說一聲就好～",
    "不用擔心會有任何推銷壓力，純粹分享好東西給好朋友。期待跟您見面！🙂",
    "如果覺得有興趣就來看看，沒興趣也沒關係，我們就當交個朋友。您覺得呢？",
  ],
  warm: [
    "時間地點都可以配合您的方便，週末或平日晚上都可以。期待您的回覆！🙌",
    "我這邊時間很彈性，配合您就好。期待我們再次碰面聊聊！😊",
    "您最近哪個時段比較有空呢？我來安排，保證讓您不虛此行！",
    "等您回覆喔～有任何問題也歡迎隨時問我，我很樂意分享更多！",
  ],
  hot: [
    "我覺得這個機會真的很適合您！找個時間我們好好聊聊，您一定會有收穫的 💪",
    "以您的眼光和能力，我相信您一看就會喜歡的！趕快約個時間吧 🔥",
    "名額有限，我特別幫您保留了一個位子。方便的話回覆我確認一下時間喔！",
    "這真的是很難得的機會，我第一個就想到您。讓我們趕快約起來吧！😆",
  ],
  loyal: [
    "另外也很想跟您聊聊經銷夥伴的升級方案，以您的實力，一定能更上一層樓！🚀",
    "接下來我們可以一起規劃更大的目標，我相信您一定會做得非常出色！一起加油 💎",
    "您的支持就是我最大的動力！期待我們一起創造更多可能性 🌟",
    "希望我們能一起把這份事業做得更好更大！什麼時候方便碰面，跟我說一聲就好 🤝",
  ],
};

function generateDraft(c: Contact): string {
  const hon = getHonorific(c);
  const heat = c.heat || "cold";

  // Pick random template from each pool
  const greetings = greetingTemplates[heat] ?? greetingTemplates.cold;
  const greeting = greetings[Math.floor(Math.random() * greetings.length)](c, hon);

  const productMention = getProductMention(c);
  const body = bodyTemplates[Math.floor(Math.random() * bodyTemplates.length)](productMention);

  const closings = closingTemplates[heat] ?? closingTemplates.cold;
  const closing = closings[Math.floor(Math.random() * closings.length)];

  return `${greeting}\n\n${body}\n\n${closing}`;
}

export function AiInviteDialog({ open, onOpenChange, contact }: AiInviteDialogProps) {
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");

  const generate = () => {
    setLoading(true);
    setDraft("");
    const timer = setTimeout(() => {
      setDraft(generateDraft(contact));
      setLoading(false);
    }, 1500);
    return timer;
  };

  useEffect(() => {
    if (open) {
      const timer = generate();
      return () => clearTimeout(timer);
    }
  }, [open, contact]);

  const handleRegenerate = () => {
    generate();
  };

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
              <button onClick={handleRegenerate} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                <RefreshCw className="h-3.5 w-3.5" />
                重新生成
              </button>
              <button onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
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
