import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Network as NetworkIcon } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { HeatLevel } from "@/data/contacts";

/**
 * 人脈網絡圖：
 * - 節點 = 聯絡人（顏色依熱度）
 * - 實線 = 推薦鏈（誰帶誰進來）
 * - 粉色虛線 = 家人朋友關係
 * - 點節點 → 跳到該聯絡人的詳細資料
 */

interface Rel { contact_id: string; related_contact_id: string; relation_type: string; }
interface Node { id: string; name: string; heat: HeatLevel; x: number; y: number; vx: number; vy: number; degree: number; }
interface Edge { a: string; b: string; kind: "referrer" | "relation"; label?: string; }

const HEAT_COLOR: Record<string, string> = {
  loyal: "#67e8f9", hot: "#fb923c", warm: "#fbbf24", cold: "#93c5fd",
};

function layout(nodes: Node[], edges: Edge[], width: number, height: number) {
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const k = Math.sqrt((width * height) / Math.max(nodes.length, 1)) * 0.55;
  for (let iter = 0; iter < 260; iter++) {
    const cool = 1 - iter / 260;
    // 斥力
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
        const d = Math.sqrt(d2);
        const f = (k * k) / d / d * 0.45;
        a.vx += dx * f; a.vy += dy * f;
        b.vx -= dx * f; b.vy -= dy * f;
      }
    }
    // 連線彈簧引力
    for (const e of edges) {
      const a = nodes[idx.get(e.a)!], b = nodes[idx.get(e.b)!];
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d * d) / k * 0.02;
      a.vx += (dx / d) * f; a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
    }
    // 向心 + 阻尼 + 邊界
    for (const n of nodes) {
      n.vx += (width / 2 - n.x) * 0.03;
      n.vy += (height / 2 - n.y) * 0.03;
      n.x += Math.max(-12, Math.min(12, n.vx * cool));
      n.y += Math.max(-12, Math.min(12, n.vy * cool));
      n.vx *= 0.55; n.vy *= 0.55;
      n.x = Math.max(40, Math.min(width - 40, n.x));
      n.y = Math.max(36, Math.min(height - 36, n.y));
    }
  }
}

export default function Network() {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { contacts, loading } = useContacts();
  const [rels, setRels] = useState<Rel[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("contact_relationships")
          .select("contact_id, related_contact_id, relation_type");
        if (data) setRels(data as Rel[]);
      } catch { /* 表未建立時略過 */ }
    })();
  }, []);

  const { nodes, edges, width, height } = useMemo(() => {
    const width = 900;
    const height = Math.max(560, Math.min(1400, contacts.length * 26));
    const golden = Math.PI * (3 - Math.sqrt(5));
    const nodes: Node[] = contacts.map((c, i) => {
      const r = 16 * Math.sqrt(i + 1), a = i * golden; // 向日葵展開避免重疊起點
      return {
        id: c.id, name: c.name, heat: c.heat,
        x: width / 2 + r * Math.cos(a), y: height / 2 + r * Math.sin(a),
        vx: 0, vy: 0, degree: 0,
      };
    });
    const ids = new Set(contacts.map((c) => c.id));
    const edges: Edge[] = [];
    for (const c of contacts) {
      if (c.referrerId && c.referrerId !== "self" && ids.has(c.referrerId)) {
        edges.push({ a: c.referrerId, b: c.id, kind: "referrer" });
      }
    }
    for (const r of rels) {
      if (ids.has(r.contact_id) && ids.has(r.related_contact_id)) {
        edges.push({ a: r.contact_id, b: r.related_contact_id, kind: "relation", label: r.relation_type });
      }
    }
    const deg = new Map<string, number>();
    for (const e of edges) {
      deg.set(e.a, (deg.get(e.a) ?? 0) + 1);
      deg.set(e.b, (deg.get(e.b) ?? 0) + 1);
    }
    for (const n of nodes) n.degree = deg.get(n.id) ?? 0;
    layout(nodes, edges, width, height);
    return { nodes, edges, width, height };
  }, [contacts, rels]);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selectedNode = selected ? nodeMap.get(selected) : null;

  return (
    <div className={`min-h-screen bg-background p-4 md:p-6`}>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> 返回
          </button>
          <h1 className="text-base md:text-lg font-semibold inline-flex items-center gap-2" style={{ color: t.titleColor }}>
            <NetworkIcon className="h-5 w-5" /> 人脈網絡圖
          </h1>
          <div className="w-14" />
        </div>

        {/* 圖例 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: HEAT_COLOR.loyal }} />忠實</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: HEAT_COLOR.hot }} />熱</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: HEAT_COLOR.warm }} />溫</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: HEAT_COLOR.cold }} />冷</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-5 border-t-2 border-zinc-500" />推薦鏈</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-5 border-t-2 border-dashed border-pink-400" />家人朋友</span>
          <span className="ml-auto">點圓圈查看，連線越多代表越是關鍵人物</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> 載入人脈資料中⋯
          </div>
        ) : nodes.length === 0 ? (
          <p className="text-center text-muted-foreground py-24">還沒有名單，先去新增第一位朋友吧！</p>
        ) : (
          <div className={`rounded-xl border ${t.accentBorder ?? "border-border"} bg-background/40 overflow-auto`}>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[640px]" style={{ touchAction: "pan-x pan-y" }}>
              {/* 連線 */}
              {edges.map((e, i) => {
                const a = nodeMap.get(e.a)!, b = nodeMap.get(e.b)!;
                const isRel = e.kind === "relation";
                return (
                  <g key={i}>
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={isRel ? "#f472b6" : "#71717a"}
                      strokeWidth={isRel ? 2 : 1.2}
                      strokeDasharray={isRel ? "5 4" : undefined}
                      opacity={selected && e.a !== selected && e.b !== selected ? 0.15 : 0.65} />
                    {isRel && e.label && (
                      <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4}
                        fontSize="10" fill="#f472b6" textAnchor="middle"
                        opacity={selected && e.a !== selected && e.b !== selected ? 0.2 : 0.9}>
                        {e.label}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* 節點 */}
              {nodes.map((n) => {
                const r = 9 + Math.min(n.degree * 2.2, 13);
                const dim = selected && selected !== n.id &&
                  !edges.some((e) => (e.a === selected && e.b === n.id) || (e.b === selected && e.a === n.id));
                return (
                  <g key={n.id} onClick={() => setSelected(selected === n.id ? null : n.id)}
                    style={{ cursor: "pointer" }} opacity={dim ? 0.35 : 1}>
                    <circle cx={n.x} cy={n.y} r={r + 3} fill={HEAT_COLOR[n.heat] ?? "#93c5fd"} opacity="0.25" />
                    <circle cx={n.x} cy={n.y} r={r} fill={HEAT_COLOR[n.heat] ?? "#93c5fd"}
                      stroke={selected === n.id ? "#fff" : "rgba(0,0,0,0.35)"} strokeWidth={selected === n.id ? 2.5 : 1} />
                    <text x={n.x} y={n.y + r + 13} fontSize="11.5" fill="#e4e4e7"
                      textAnchor="middle" className="select-none" stroke="rgba(0,0,0,0.7)" strokeWidth="2.5" paintOrder="stroke">
                      {n.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* 選取節點的資訊卡 */}
        {selectedNode && (
          <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${t.accentBorder ?? "border-border"} ${t.cardBg ?? "bg-card"}`}>
            <div className="text-sm">
              <span className="font-semibold">{selectedNode.name}</span>
              <span className="text-muted-foreground ml-2">{selectedNode.degree} 條連結</span>
            </div>
            <button onClick={() => navigate(`/?contact=${selectedNode.id}`)}
              className="text-sm bg-primary/15 text-primary border border-primary/30 px-3 py-1.5 rounded-md hover:bg-primary/25 transition-colors">
              查看資料 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
