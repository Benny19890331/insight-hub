import { Contact } from "@/data/contacts";

interface FunnelStatsProps {
  contacts: Contact[];
}

export function FunnelStats({ contacts }: FunnelStatsProps) {
  const total = contacts.length;
  const hot = contacts.filter((c) => c.heat === "hot").length;
  const warm = contacts.filter((c) => c.heat === "warm").length;
  const loyal = contacts.filter((c) => c.heat === "loyal").length;
  const cold = contacts.filter((c) => c.heat === "cold").length;

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="grid grid-cols-5 gap-1 rounded-lg border border-border bg-muted/20 p-2.5">
        <StatCell label="總名單" value={total} color="text-foreground" />
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
