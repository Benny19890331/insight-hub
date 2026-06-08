import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { useTheme } from "@/hooks/useTheme";
import { Contact } from "@/data/contacts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface TrashItem extends Contact {
  // deleted_at is stamped on the row but Contact type doesn't model it; we surface via raw fetch
  deletedAt?: string;
}

function daysUntilPurge(deletedAt?: string): number {
  if (!deletedAt) return 30;
  const ms = 30 * 86400000 - (Date.now() - new Date(deletedAt).getTime());
  return Math.max(0, Math.ceil(ms / 86400000));
}

export default function Trash() {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { fetchTrash, restoreContact, permanentlyDeleteContact, emptyTrash } = useContacts();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await fetchTrash();
    // fetchTrash returns Contact[] but we need deleted_at — re-query raw
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: raw } = await supabase.from("contacts")
        .select("id, deleted_at")
        .eq("user_id", user.id)
        .not("deleted_at", "is", null);
      const delMap = new Map((raw ?? []).map((r: any) => [r.id, r.deleted_at]));
      setItems(data.map((c) => ({ ...c, deletedAt: delMap.get(c.id) })));
    } else {
      setItems(data);
    }
    setLoading(false);
  }, [fetchTrash]);

  useEffect(() => { reload(); }, [reload]);

  const handleRestore = async (id: string) => {
    setBusyId(id);
    await restoreContact(id);
    setItems((prev) => prev.filter((c) => c.id !== id));
    setBusyId(null);
  };

  const handlePurge = async (id: string) => {
    setBusyId(id);
    await permanentlyDeleteContact(id);
    setItems((prev) => prev.filter((c) => c.id !== id));
    setBusyId(null);
  };

  const handleEmpty = async () => {
    await emptyTrash();
    setItems([]);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className={`flex items-center justify-between border-b px-4 h-14 sticky top-0 z-10 ${t.headerBg} ${t.headerBorder}`}>
        <button
          onClick={() => navigate("/")}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${t.btnOutline}`}
        >
          <ArrowLeft className="h-4 w-4" /> 返回
        </button>
        <h1 className="text-base font-semibold flex items-center gap-2">
          <Trash2 className="h-4 w-4" /> 資源回收筒
        </h1>
        {items.length > 0 ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 text-destructive px-3 py-1.5 text-xs hover:bg-destructive/10">
                清空全部
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>清空回收筒？</AlertDialogTitle>
                <AlertDialogDescription>
                  將永久刪除回收筒內 {items.length} 筆名單，此動作無法復原。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleEmpty} className="bg-destructive hover:bg-destructive/90">
                  永久清空
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div className="w-16" />
        )}
      </header>

      <div className="max-w-2xl mx-auto p-4 pb-20 space-y-2">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <span>刪除的名單會保留 30 天，期間可隨時還原。超過 30 天或手動清空後將永久刪除。</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> 載入中⋯
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Trash2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>回收筒是空的</p>
          </div>
        )}

        {!loading && items.map((c) => {
          const remain = daysUntilPurge(c.deletedAt);
          return (
            <div key={c.id} className={`flex items-center gap-3 rounded-lg border ${t.cardBorder} p-3`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${t.accentBg} ${t.accentBorder} border ${t.accent}`}>
                {c.avatarUrl ? <img src={c.avatarUrl} alt={c.name} className="h-full w-full rounded-full object-cover" /> : c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {c.region || "—"}
                  <span className={`ml-2 ${remain <= 3 ? "text-red-500 font-medium" : ""}`}>
                    · {remain} 天後永久刪除
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleRestore(c.id)}
                disabled={busyId === c.id}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 text-emerald-500 px-2.5 py-1.5 text-xs hover:bg-emerald-500/10 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> 還原
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={busyId === c.id}
                    className="inline-flex items-center gap-1 rounded-md border border-destructive/40 text-destructive px-2.5 py-1.5 text-xs hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>永久刪除「{c.name}」？</AlertDialogTitle>
                    <AlertDialogDescription>此動作無法復原。</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handlePurge(c.id)} className="bg-destructive hover:bg-destructive/90">
                      永久刪除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        })}
      </div>
    </div>
  );
}
