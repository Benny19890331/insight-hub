import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/hooks/useTheme";

const steps = [
  {
    icon: "🎨",
    title: "個人化外觀",
    desc: "點右上角 🎨 切換背景主題，A 按鈕可調整字級大小，照顧長輩閱讀需求。",
  },
  {
    icon: "👤",
    title: "新增名單",
    desc: "點右上角「人頭」按鈕，填入姓名與基本資料，即可建立新的人脈名單。",
  },
  {
    icon: "🗓",
    title: "記錄互動",
    desc: "進入聯絡人後，可以新增互動紀錄、設定下次邀約時間，系統會自動更新熱度。",
  },
  {
    icon: "🤖",
    title: "AI 邀約話術",
    desc: "在聯絡人頁面點「AI 生成邀約」，系統會根據對方背景與熱度，給出量身打造的邀約文字。",
  },
  {
    icon: "🎂",
    title: "生日提醒",
    desc: "首頁置頂會顯示「今天」與「30 天內」要過生日的名單，輕輕一點就能跳到聯絡人。",
  },
  {
    icon: "🔍",
    title: "搜尋與篩選",
    desc: "在搜尋框輸入姓名、地區、標籤；下方可依熱度（🔥 熱 / 🌤 溫 / 🧊 冷 / 💎 忠實）或產品篩選。",
  },
  {
    icon: "📥",
    title: "匯入 / 匯出",
    desc: "右上角「匯入/出」可一鍵備份名單為 CSV 檔，避免資料遺失。",
  },
];

export function TutorialButton() {
  const { theme: t } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="使用教學"
        className={`fixed bottom-5 right-4 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95 ${t.btnOutline}`}
        style={{ background: "hsl(var(--background) / 0.85)" }}
      >
        <HelpCircle className={`h-6 w-6 ${t.accent}`} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              使用教學
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              歡迎使用 RICH 系統！以下是常用功能的快速說明：
            </p>
            {steps.map((s, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-border/60 p-3 bg-card/40">
                <span className="text-2xl shrink-0">{s.icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold mb-0.5">
                    {i + 1}. {s.title}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
            <button
              onClick={() => setOpen(false)}
              className="w-full mt-2 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              我知道了
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
