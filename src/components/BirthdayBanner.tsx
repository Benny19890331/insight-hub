import { useMemo, useState } from "react";
import { Cake, ChevronDown, ChevronUp } from "lucide-react";
import { Contact } from "@/data/contacts";
import { useTheme } from "@/hooks/useTheme";

interface BirthdayBannerProps {
  contacts: Contact[];
  onSelect: (c: Contact) => void;
}

interface BirthdayInfo {
  contact: Contact;
  daysUntil: number;
  monthDay: string;
}

function parseBirthday(b?: string): { month: number; day: number } | null {
  if (!b) return null;
  // Accept YYYY-MM-DD or MM-DD
  const m = b.match(/(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

function daysUntilBirthday(month: number, day: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  let next = new Date(year, month - 1, day);
  next.setHours(0, 0, 0, 0);
  if (next < today) {
    next = new Date(year + 1, month - 1, day);
  }
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export function BirthdayBanner({ contacts, onSelect }: BirthdayBannerProps) {
  const { theme: t } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const upcoming = useMemo<BirthdayInfo[]>(() => {
    const list: BirthdayInfo[] = [];
    for (const c of contacts) {
      const parsed = parseBirthday(c.birthday);
      if (!parsed) continue;
      const days = daysUntilBirthday(parsed.month, parsed.day);
      if (days <= 30) {
        list.push({
          contact: c,
          daysUntil: days,
          monthDay: `${parsed.month}/${parsed.day}`,
        });
      }
    }
    return list.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [contacts]);

  if (upcoming.length === 0) return null;

  const todayCount = upcoming.filter((u) => u.daysUntil === 0).length;
  const display = expanded ? upcoming : upcoming.slice(0, 3);

  return (
    <div className={`mx-3 mt-2 mb-2 rounded-xl border ${t.cardBorder} ${t.accentBg} overflow-hidden`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Cake className={`h-4 w-4 ${t.accent}`} />
          <span className={`text-xs font-semibold ${t.textColor}`}>
            生日提醒
          </span>
          <span className={`text-[11px] ${t.mutedText}`}>
            {todayCount > 0 ? `今天 ${todayCount} 位 · ` : ""}30 天內 {upcoming.length} 位
          </span>
        </div>
        {expanded ? (
          <ChevronUp className={`h-4 w-4 ${t.mutedText}`} />
        ) : (
          <ChevronDown className={`h-4 w-4 ${t.mutedText}`} />
        )}
      </button>
      <div className="px-2 pb-2 space-y-1">
        {display.map((b) => {
          const isToday = b.daysUntil === 0;
          const isSoon = b.daysUntil <= 7;
          return (
            <button
              key={b.contact.id}
              onClick={() => onSelect(b.contact)}
              className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${t.cardHover}`}
            >
              <span className="text-base shrink-0">{isToday ? "🎉" : "🎂"}</span>
              <span className={`text-sm font-medium truncate flex-1 ${t.textColor}`}>
                {b.contact.name}
              </span>
              <span className={`text-[11px] shrink-0 ${isToday ? "text-red-500 font-bold" : isSoon ? t.accent : t.mutedText}`}>
                {isToday ? "今天！" : b.daysUntil === 1 ? "明天" : `${b.monthDay} · ${b.daysUntil}天`}
              </span>
            </button>
          );
        })}
        {!expanded && upcoming.length > 3 && (
          <button
            onClick={() => setExpanded(true)}
            className={`w-full text-[11px] py-1 ${t.mutedText} hover:underline`}
          >
            還有 {upcoming.length - 3} 位…
          </button>
        )}
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            className={`w-full flex items-center justify-center gap-1 text-[11px] py-1.5 mt-1 rounded-md border ${t.cardBorder} ${t.mutedText} ${t.cardHover}`}
          >
            <ChevronUp className="h-3 w-3" />
            收起
          </button>
        )}
      </div>
    </div>
  );
}
