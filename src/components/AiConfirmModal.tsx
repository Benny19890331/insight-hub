import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Sparkles, Pencil } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import bgGirl from "@/assets/bg-girl.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgViolet from "@/assets/bg-violet.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const bgBlack = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMwMDAwMDAiLz48L3N2Zz4=";
const bgWhite = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=";
const bgImages = [bgGirl, bgViolet, bgYouth, bgPrime, bgWisdom, bgBlack, bgWhite];

interface AiConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: Record<string, any> | null;
  mode: "contact" | "interaction";
  onConfirm: (data: Record<string, any>) => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: "姓名",
  nickname: "綽號",
  region: "地區",
  background: "背景/職業",
  birthday: "生日",
  gender: "性別",
  contactMethod: "聯絡方式",
  products: "產品標籤",
  heat: "熱度",
  notes: "備註",
  date: "日期",
  summary: "互動內容",
};

const HEAT_LABELS: Record<string, string> = {
  cold: "🧊 冷",
  warm: "🌤 溫",
  hot: "🔥 熱",
  loyal: "💎 忠實",
};

const GENDER_LABELS: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
};

function TypewriterText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) {
        clearInterval(interval);
        onDone?.();
      }
    }, 25);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-[2px] h-[1em] bg-primary animate-pulse ml-[1px] align-middle" />
      )}
    </span>
  );
}

function formatValue(key: string, value: any): string {
  if (Array.isArray(value)) return value.join("、");
  if (key === "heat") return HEAT_LABELS[value] || value;
  if (key === "gender") return GENDER_LABELS[value] || value;
  return String(value || "");
}

export function AiConfirmModal({ open, onOpenChange, data, mode, onConfirm }: AiConfirmModalProps) {
  const { themeIndex } = useTheme();
  const isLight = themeIndex <= 1 || themeIndex === 6;
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [animationDone, setAnimationDone] = useState(false);
  const animatedCount = useRef(0);

  useEffect(() => {
    if (data && open) {
      setEditedData({ ...data });
      setAnimationDone(false);
      animatedCount.current = 0;
    }
  }, [data, open]);

  if (!data) return null;

  const fields = Object.entries(editedData).filter(
    ([_, v]) => v !== "" && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)
  );

  const totalFields = fields.length;

  const handleFieldDone = () => {
    animatedCount.current++;
    if (animatedCount.current >= totalFields) {
      setAnimationDone(true);
    }
  };

  const handleFieldEdit = (key: string, newValue: string) => {
    setEditedData((prev) => {
      const updated = { ...prev };
      if (Array.isArray(prev[key])) {
        updated[key] = newValue.split(/[,、，]/).map((s) => s.trim()).filter(Boolean);
      } else {
        updated[key] = newValue;
      }
      return updated;
    });
    setEditingField(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md overflow-hidden p-0 border-0 bg-transparent !top-[2dvh] !translate-y-0 sm:!top-[50%] sm:!translate-y-[-50%] [&>button]:z-30 [&>button]:bg-black/50 [&>button]:rounded-full [&>button]:p-1"
        style={{ maxHeight: "96dvh" }}
      >
        <div className="relative overflow-hidden rounded-2xl h-full">
          <div className="absolute inset-0 overflow-hidden">
            <img src={bgImages[themeIndex]} alt="" className="absolute inset-0 w-full h-full object-cover bg-animate-drift" />
            <div className={`absolute inset-0 ${isLight ? '' : 'bg-black/60'}`} />
          </div>
          <div className="relative z-10 p-6 pt-10 pb-6 overflow-y-auto overscroll-contain" style={{ maxHeight: "96dvh", WebkitOverflowScrolling: "touch" }}>
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI 解析確認
              </DialogTitle>
              <DialogDescription>
                請確認以下資料，可直接點擊欄位修改
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 pt-2">
              {fields.map(([key, value], i) => {
                const label = FIELD_LABELS[key] || key;
                const displayVal = formatValue(key, value);
                const isEditing = editingField === key;

                return (
                  <div
                    key={key}
                    className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm px-3 py-2.5 hover:border-primary/40 hover:bg-card/80 transition-all cursor-pointer"
                    style={{ animationDelay: `${i * 80}ms` }}
                    onClick={() => !isEditing && setEditingField(key)}
                  >
                    <span className="text-xs text-foreground/70 min-w-[4.5rem] pt-0.5 shrink-0">
                      {label}
                    </span>
                    <div className="flex-1 text-sm text-foreground min-w-0">
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={Array.isArray(value) ? value.join("、") : String(value || "")}
                          onBlur={(e) => handleFieldEdit(key, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleFieldEdit(key, (e.target as HTMLInputElement).value);
                          }}
                          className="w-full bg-background/80 border border-primary/40 rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <TypewriterText text={displayVal} onDone={handleFieldDone} />
                      )}
                    </div>
                    {!isEditing && (
                      <Pencil className="h-3 w-3 text-foreground/60 opacity-0 group-hover:opacity-80 transition-opacity shrink-0 mt-1" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 pb-2">
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-border bg-card/60 backdrop-blur-sm px-4 py-2 text-sm text-foreground hover:bg-card/80 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => onConfirm(editedData)}
                className="neon-btn-cyan flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                正式建檔
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
