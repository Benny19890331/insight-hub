import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Flame, UserPlus, MessageSquare, Loader2 } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { useTheme } from "@/hooks/useTheme";
import { Contact, HeatLevel } from "@/data/contacts";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";

const HEAT_META: Record<HeatLevel, { label: string; color: string }> = {
  loyal: { label: "💎 忠實", color: "#a78bfa" },
  hot: { label: "🔥 熱", color: "#f87171" },
  warm: { label: "🌤 溫", color: "#fbbf24" },
  cold: { label: "🧊 冷", color: "#60a5fa" },
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [, m] = key.split("-");
  return `${parseInt(m, 10)}月`;
}
function lastNMonths(n: number): string[] {
  const arr: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push(monthKey(d));
  }
  return arr;
}

function computeStats(contacts: Contact[]) {
  const total = contacts.length;
  const hotLoyal = contacts.filter((c) => c.heat === "hot" || c.heat === "loyal").length;

  const now = new Date();
  const thisMonth = monthKey(now);

  // Heat distribution
  const heatCounts: Record<HeatLevel, number> = { loyal: 0, hot: 0, warm: 0, cold: 0 };
  contacts.forEach((c) => {
    heatCounts[c.heat] = (heatCounts[c.heat] ?? 0) + 1;
  });
  const heatData = (Object.keys(heatCounts) as HeatLevel[])
    .filter((k) => heatCounts[k] > 0)
    .map((k) => ({ name: HEAT_META[k].label, value: heatCounts[k], color: HEAT_META[k].color }));

  // 6-month trends — new contacts by lastContactDate fallback to created (we use lastContactDate as proxy)
  const months = lastNMonths(6);
  const interactionByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
  const newByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));

  let interactionsThisMonth = 0;
  contacts.forEach((c) => {
    // Treat earliest interaction (or lastContactDate) as "first met" proxy
    const firstDate = c.interactions.length
      ? c.interactions.reduce((min, i) => (i.date < min ? i.date : min), c.interactions[0].date)
      : c.lastContactDate;
    if (firstDate) {
      const k = firstDate.slice(0, 7);
      if (k in newByMonth) newByMonth[k]++;
    }
    c.interactions.forEach((i) => {
      const k = (i.date || "").slice(0, 7);
      if (k in interactionByMonth) interactionByMonth[k]++;
      if (k === thisMonth) interactionsThisMonth++;
    });
  });

  const newThisMonth = newByMonth[thisMonth] ?? 0;

  const trendData = months.map((m) => ({
    month: monthLabel(m),
    新增: newByMonth[m],
    互動: interactionByMonth[m],
  }));

  // Top regions
  const regionCounts: Record<string, number> = {};
  contacts.forEach((c) => {
    const r = (c.region || "").trim() || "未填";
    regionCounts[r] = (regionCounts[r] ?? 0) + 1;
  });
  const regionData = Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  // Top products
  const productCounts: Record<string, number> = {};
  contacts.forEach((c) => {
    (c.productTags ?? []).forEach((p) => {
      const tag = p.trim();
      if (!tag) return;
      productCounts[tag] = (productCounts[tag] ?? 0) + 1;
    });
  });
  const productData = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  // Coldness funnel: days since last contact buckets
  const today = Date.now();
  const buckets = { "≤7天": 0, "8–30天": 0, "31–60天": 0, ">60天": 0, "從未聯絡": 0 };
  contacts.forEach((c) => {
    if (!c.lastContactDate) { buckets["從未聯絡"]++; return; }
    const days = Math.floor((today - new Date(c.lastContactDate).getTime()) / 86400000);
    if (days <= 7) buckets["≤7天"]++;
    else if (days <= 30) buckets["8–30天"]++;
    else if (days <= 60) buckets["31–60天"]++;
    else buckets[">60天"]++;
  });
  const coldnessData = Object.entries(buckets).map(([name, value]) => ({ name, value }));

  return {
    total,
    hotLoyal,
    newThisMonth,
    interactionsThisMonth,
    heatData,
    trendData,
    regionData,
    productData,
    coldnessData,
  };
}

const COLDNESS_COLORS = ["#10b981", "#fbbf24", "#fb923c", "#ef4444", "#94a3b8"];

export default function Reports() {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { contacts, loading } = useContacts();

  const stats = useMemo(() => computeStats(contacts), [contacts]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> 載入中⋯
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${t.headerBg} ${t.authCardText}`}>
      <header className={`flex items-center gap-3 border-b px-4 md:px-6 h-14 ${t.headerBorder}`}>
        <button
          onClick={() => navigate("/")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${t.btnOutline}`}
        >
          <ArrowLeft className="h-4 w-4" /> 返回
        </button>
        <h1 className="text-base font-semibold tracking-tight" style={{ color: t.titleColor }}>
          數據報表總覽
        </h1>
        <span className={`text-xs ${t.mutedText}`}>共 {stats.total} 筆名單</span>
      </header>

      <main className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* KPI cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={<Users className="h-5 w-5" />} label="名單總數" value={stats.total} t={t} />
          <KpiCard icon={<Flame className="h-5 w-5" />} label="熱+忠實" value={stats.hotLoyal} t={t}
            sub={stats.total ? `${Math.round((stats.hotLoyal / stats.total) * 100)}%` : "—"} />
          <KpiCard icon={<UserPlus className="h-5 w-5" />} label="本月新增" value={stats.newThisMonth} t={t} />
          <KpiCard icon={<MessageSquare className="h-5 w-5" />} label="本月互動" value={stats.interactionsThisMonth} t={t} />
        </section>

        {/* Heat + Coldness */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="熱度分佈" t={t}>
            {stats.heatData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={stats.heatData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
                    {stats.heatData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="聯絡冷度分佈" t={t}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.coldnessData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {stats.coldnessData.map((_, i) => <Cell key={i} fill={COLDNESS_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        {/* 6-month trend */}
        <ChartCard title="近 6 個月：新增名單 vs 互動次數" t={t}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="新增" fill="#34d399" radius={[6, 6, 0, 0]} />
              <Bar dataKey="互動" fill="#60a5fa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Region + Products */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="地區 Top 6" t={t}>
            {stats.regionData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.regionData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="#a78bfa" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="熱門產品標籤" t={t}>
            {stats.productData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.productData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </section>

        <p className={`text-xs text-center ${t.mutedText} pb-8`}>
          所有數據即時計算自您的名單與互動紀錄
        </p>
      </main>
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "rgba(15,23,42,0.92)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  fontSize: 12,
  color: "#fff",
};

function KpiCard({ icon, label, value, sub, t }: { icon: React.ReactNode; label: string; value: number; sub?: string; t: any }) {
  return (
    <div className={`rounded-xl border p-3 ${t.cardBorder}`} style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className={`flex items-center gap-1.5 text-xs ${t.mutedText}`}>
        {icon}<span>{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color: t.titleColor }}>{value}</span>
        {sub && <span className={`text-xs ${t.mutedText}`}>{sub}</span>}
      </div>
    </div>
  );
}

function ChartCard({ title, children, t }: { title: string; children: React.ReactNode; t: any }) {
  return (
    <div className={`rounded-xl border p-4 ${t.cardBorder}`} style={{ background: "rgba(255,255,255,0.04)" }}>
      <h2 className="text-sm font-semibold mb-2" style={{ color: t.titleColor }}>{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground">暫無資料</div>;
}
