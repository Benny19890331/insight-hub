/**
 * 生日輸入欄：平時只顯示日期文字，點擊後從底部彈出 iPhone 風格三欄滾輪。
 */
import { useEffect, useMemo, useState } from "react";
import { ScrollPicker } from "@/components/ScrollPicker";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { X } from "lucide-react";

interface BirthdayInputProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  inputClassName?: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1925 + 1 }, (_, i) => String(1925 + i));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

const DEFAULT_Y = "1990";
const DEFAULT_M = "01";
const DEFAULT_D = "01";

export function BirthdayInput({ value, onChange, className = "", inputClassName }: BirthdayInputProps) {
  const [open, setOpen] = useState(false);

  // 暫存滾輪選擇
  const initial = useMemo(() => {
    const [y, m, d] = value.split("-");
    return { y: y || DEFAULT_Y, m: m || DEFAULT_M, d: d || DEFAULT_D };
  }, [value]);

  const [y, setY] = useState(initial.y);
  const [m, setM] = useState(initial.m);
  const [d, setD] = useState(initial.d);

  // 開啟時帶入目前值
  useEffect(() => {
    if (open) {
      setY(initial.y);
      setM(initial.m);
      setD(initial.d);
    }
  }, [open, initial.y, initial.m, initial.d]);

  const days = useMemo(() => {
    const max = daysInMonth(parseInt(y), parseInt(m));
    return Array.from({ length: max }, (_, i) => String(i + 1).padStart(2, "0"));
  }, [y, m]);

  // 日 clamp
  useEffect(() => {
    if (!days.includes(d)) setD(days[days.length - 1]);
  }, [days, d]);

  const triggerClass = inputClassName
    ? inputClassName
    : "w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm";

  const handleConfirm = () => {
    const max = daysInMonth(parseInt(y), parseInt(m));
    const safeD = parseInt(d) > max ? String(max).padStart(2, "0") : d;
    onChange(`${y}-${m}-${safeD}`);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${triggerClass} text-left flex items-center justify-between gap-2`}
      >
        <span className={value ? "font-mono" : "text-muted-foreground"}>
          {value || "點此選擇生日"}
        </span>
        {value && (
          <span
            role="button"
            aria-label="清除生日"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </span>
        )}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="px-4 pb-6">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center justify-between py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground px-2 py-1"
              >
                取消
              </button>
              <DrawerTitle className="text-base">選擇生日</DrawerTitle>
              <button
                type="button"
                onClick={handleConfirm}
                className="text-sm font-semibold text-primary px-2 py-1"
              >
                完成
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div>
                <div className="text-xs text-muted-foreground text-center mb-1">年</div>
                <ScrollPicker items={YEARS} value={y} onChange={setY} height={180} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground text-center mb-1">月</div>
                <ScrollPicker items={MONTHS} value={m} onChange={setM} height={180} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground text-center mb-1">日</div>
                <ScrollPicker
                  items={days}
                  value={days.includes(d) ? d : days[days.length - 1]}
                  onChange={setD}
                  height={180}
                />
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
