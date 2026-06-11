/**
 * 生日輸入欄:不論使用者裝置語言為何，一律顯示 yyyy/mm/dd。
 * 點擊仍開啟原生日曆選擇器（手機/平板友善），右側附清除鈕。
 */
interface BirthdayInputProps {
  value: string;                      // ISO 格式 yyyy-mm-dd（與資料庫一致）
  onChange: (v: string) => void;
  className?: string;                 // 外層容器樣式
  inputClassName?: string;            // 覆寫輸入框樣式（沿用各視窗主題）
}

const formatDisplay = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${y}/${m}/${d}` : "";
};

export function BirthdayInput({ value, onChange, className = "", inputClassName }: BirthdayInputProps) {
  const baseInput =
    inputClassName ??
    "w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[38px]";

  return (
    <div className={`relative ${className}`}>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseInput} pr-16 text-transparent caret-transparent [&::-webkit-datetime-edit]:opacity-0`}
      />
      {/* 統一格式的顯示層：不論裝置語言，一律顯示 yyyy/mm/dd 或「年/月/日」提示 */}
      <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm ${value ? "text-foreground" : "text-muted-foreground"}`}>
        {value ? formatDisplay(value) : "年/月/日"}
      </span>
      {value && (
        <>
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="清除生日"
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}
