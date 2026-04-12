import { useMemo } from "react";
import { Contact } from "@/data/contacts";
import { useTheme } from "@/hooks/useTheme";

interface FunnelStatsProps {
  contacts: Contact[];
}

export function FunnelStats({ contacts }: FunnelStatsProps) {
  const { theme: t } = useTheme();
  const { total, hot, warm, loyal, cold } = useMemo(() => {
    let hot = 0, warm = 0, loyal = 0, cold = 0;
    for (const c of contacts) {
      if (c.heat === "hot") hot++;
      else if (c.heat === "warm") warm++;
      else if (c.heat === "loyal") loyal++;
      else cold++;
    }
    return { total: contacts.length, hot, warm, loyal, cold };
  }, [contacts]);

  return (
    <div className="px-4 pt-4 pb-2">
      <div className={`grid grid-cols-5 gap-1 rounded-lg border p-2.5 transition-colors duration-500 ${t.cardBg} ${t.cardBorder}`}>
        <StatCell label="總名單" value={total} color={t.accent} />
        <StatCell label="🔥 熱" value={hot} color="text-badge-hot" />
        <StatCell label="🌤 溫" value={warm} color="text-badge-warm" />
        <StatCell label="🧊 冷" value={cold} color="text-badge-cool" />
        <StatCell label="💎 忠實" value={loyal} color="text-badge-success" />
      </div>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</p>
    </div>
  );
}
