import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Contact } from "@/data/contacts";
import { toast } from "sonner";
import { Heart, X, Plus, Search } from "lucide-react";

/**
 * 家人朋友關係連結：
 * 把名單裡的兩位聯絡人連起來（配偶、父母、好友⋯），
 * 雙向顯示（在 A 看到 B 是父母，在 B 就看到 A 是子女），點名字跳到對方資料。
 */

const RELATION_TYPES = ["配偶", "男女朋友", "父母", "子女", "兄弟姊妹", "親戚", "好友", "同事"] as const;

// relation_type 的語意：「related_contact 是 contact 的 ___」
// 從另一邊看時用反向稱謂顯示
const INVERSE: Record<string, string> = {
  "配偶": "配偶", "男女朋友": "男女朋友", "父母": "子女", "子女": "父母",
  "兄弟姊妹": "兄弟姊妹", "親戚": "親戚", "好友": "好友", "同事": "同事",
};

interface Rel {
  id: string;
  contact_id: string;
  related_contact_id: string;
  relation_type: string;
}

interface Props {
  contact: Contact;
  contacts: Contact[];
  onSelectContact?: (id: string) => void;
  labelClass?: string;
}

export function RelationshipSection({ contact, contacts, onSelectContact, labelClass = "text-muted-foreground" }: Props) {
  const { user } = useAuth();
  const [rels, setRels] = useState<Rel[]>([]);
  const [adding, setAdding] = useState(false);
  const [relType, setRelType] = useState<string>("好友");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("contact_relationships")
        .select("id, contact_id, related_contact_id, relation_type")
        .or(`contact_id.eq.${contact.id},related_contact_id.eq.${contact.id}`);
      if (!error && data) setRels(data as Rel[]);
    } catch { /* 表尚未建立時靜默略過 */ }
  }, [contact.id]);

  useEffect(() => { load(); }, [load]);

  const nameOf = (id: string) => contacts.find((c) => c.id === id);

  // 已連結的對方 id（避免重複加）
  const linkedIds = new Set(rels.map((r) => (r.contact_id === contact.id ? r.related_contact_id : r.contact_id)));

  const candidates = search.trim()
    ? contacts.filter(
        (c) =>
          c.id !== contact.id &&
          !linkedIds.has(c.id) &&
          (c.name.includes(search.trim()) || (c.nickname ?? "").includes(search.trim()))
      ).slice(0, 6)
    : [];

  const addRelation = async (target: Contact) => {
    if (!user) { toast.error("請先登入"); return; }
    const { error } = await (supabase as any).from("contact_relationships").insert({
      user_id: user.id,
      contact_id: contact.id,
      related_contact_id: target.id,
      relation_type: relType,
    });
    if (error) { toast.error("新增關係失敗，請稍後再試"); return; }
    toast.success(`已連結：${target.name} 是 ${contact.name} 的${relType}`);
    setSearch(""); setAdding(false);
    load();
  };

  const removeRelation = async (rel: Rel, otherName: string) => {
    if (!window.confirm(`確定要移除與「${otherName}」的關係連結嗎？`)) return;
    const { error } = await (supabase as any).from("contact_relationships").delete().eq("id", rel.id);
    if (error) { toast.error("移除失敗，請稍後再試"); return; }
    load();
  };

  return (
    <div className="space-y-2">
      <p className={`text-xs ${labelClass} flex items-center gap-1.5`}>
        <Heart className="h-3.5 w-3.5" /> 家人朋友關係
      </p>

      {/* 既有關係 chips */}
      {rels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {rels.map((r) => {
            const isOwner = r.contact_id === contact.id;
            const otherId = isOwner ? r.related_contact_id : r.contact_id;
            const other = nameOf(otherId);
            if (!other) return null;
            const label = isOwner ? r.relation_type : (INVERSE[r.relation_type] ?? r.relation_type);
            return (
              <span key={r.id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 pl-2.5 pr-1 py-1 text-xs">
                <span className="text-muted-foreground">{label}</span>
                <button onClick={() => onSelectContact?.(other.id)}
                  className="font-medium text-primary hover:underline cursor-pointer">
                  {other.name}
                </button>
                <button onClick={() => removeRelation(r, other.name)} aria-label="移除關係"
                  className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : !adding ? (
        <p className="text-sm text-muted-foreground">尚未建立關係連結</p>
      ) : null}

      {/* 新增關係 */}
      {adding ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap gap-1.5">
            {RELATION_TYPES.map((rt) => (
              <button key={rt} type="button" onClick={() => setRelType(rt)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  relType === rt
                    ? "border-primary/60 bg-primary/15 text-primary font-medium"
                    : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}>
                {rt}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`搜尋要連結的人（${contact.name} 的${relType}）⋯`}
              className="w-full rounded-lg border border-border bg-muted/50 pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          {candidates.length > 0 && (
            <div className="rounded-lg border border-border bg-background/80 overflow-hidden">
              {candidates.map((c) => (
                <button key={c.id} type="button" onClick={() => addRelation(c)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                  {c.name}
                  {c.nickname && <span className="text-xs text-muted-foreground ml-1">({c.nickname})</span>}
                  <span className="text-xs text-muted-foreground ml-2">{c.region}</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => { setAdding(false); setSearch(""); }}
            className="text-xs text-muted-foreground hover:text-foreground">
            取消
          </button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 text-xs bg-primary/15 text-primary border border-primary/30 px-2.5 py-1 rounded-md hover:bg-primary/25 transition-colors">
          <Plus className="h-3 w-3" /> 新增關係
        </button>
      )}
    </div>
  );
}
