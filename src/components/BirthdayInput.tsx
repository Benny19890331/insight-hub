/**
 * 生日輸入欄：直接顯示「年 / 月 / 日」三欄滾輪（所見即所得）。
 * 所見即所選，對長輩友善；不再彈出系統日期選擇器。
 */
import { useEffect, useMemo, useState } from "react";
import { ScrollPicker } from "@/components/ScrollPicker";

interface BirthdayInputProps {
  value: string;                      // ISO 格式 yyyy-mm-dd（與資料庫一致）
  onChange: (v: string) => void;
  className?: string;                 // 外層容器樣式
  inputClassName?: string;            // 外層容器額外樣式（沿用各視窗主題）
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1925 + 1 }, (_, i) => String(1925 + i));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

const DEFAULT_Y = "1990";
const DEFAULT_M = "01";
const DEFAULT_D = "01";

export function BirthdayInput({ value, onChange, className = "", inputClassName }: BirthdayInputProps) {
  // 解析 value
  const parsed = useMemo(() => {
    const [y, m, d] = value.split("-");
    return { y: y || DEFAULT_Y, m: m || DEFAULT_M, d: d || DEFAULT_D };
  }, [value]);

  const [y, setY] = useState(parsed.y);
  const [m, setM] = useState(parsed.m);
  const [d, setD] = useState(parsed.d);

  // 外部 value 變動時同步
  useEffect(() => {
    setY(parsed.y);
    setM(parsed.m);
    setD(parsed.d);
  }, [parsed.y, parsed.m, parsed.d]);

  // 動態當月天數
  const days = useMemo(() => {
    const max = daysInMonth(parseInt(y), parseInt(m));
    return Array.from({ length: max }, (_, i) => String(i + 1).padStart(2, "0"));
  }, [y, m]);

  // 若日超過該月最大天數，自動 clamp
  useEffect(() => {
    if (!days.includes(d)) {
      const last = days[days.length - 1];
      setD(last);
      if (value) onChange(`${y}-${m}-${last}`);
    }
  }, [days, d, y, m, value, onChange]);

  const emit = (ny: string, nm: string, nd: string) => {
    const max = daysInMonth(parseInt(ny), parseInt(nm));
    const safeD = parseInt(nd) > max ? String(max).padStart(2, "0") : nd;
    onChange(`${ny}-${nm}-${safeD}`);
  };

  const containerClass = inputClassName
    ? `${inputClassName} p-2`
    : "rounded-lg border border-border bg-muted/50 p-2";

  return (
    <div className={`relative ${className}`}>
      <div className={containerClass}>
        <div className="grid grid-cols-3 gap-1.5">
          <div>
            <div className="text-[10px] text-muted-foreground text-center mb-0.5">年</div>
            <ScrollPicker
              items={YEARS}
              value={y}
              onChange={(nv) => { setY(nv); emit(nv, m, d); }}
            />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground text-center mb-0.5">月</div>
            <ScrollPicker
              items={MONTHS}
              value={m}
              onChange={(nv) => { setM(nv); emit(y, nv, d); }}
            />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground text-center mb-0.5">日</div>
            <ScrollPicker
              items={days}
              value={days.includes(d) ? d : days[days.length - 1]}
              onChange={(nv) => { setD(nv); emit(y, m, nv); }}
            />
          </div>
        </div>
        {value && (
          <div className="mt-1.5 flex justify-center">
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="清除生日"
              className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              ✕ 清除生日
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
