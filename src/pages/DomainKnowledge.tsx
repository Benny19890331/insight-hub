import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, BookOpen } from "lucide-react";
import bgGirl from "@/assets/bg-girl.jpg";
import bgViolet from "@/assets/bg-violet.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const bgImages = [bgGirl, bgViolet, bgYouth, bgPrime, bgWisdom];

export default function DomainKnowledge() {
  const { theme: t, themeIndex } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      const admin = !!roleRow;
      setIsAdmin(admin);
      if (!admin) {
        toast.error("僅管理員可進入此頁");
        navigate("/");
        return;
      }
      const { data, error } = await supabase
        .from("domain_knowledge")
        .select("content, updated_at")
        .eq("id", 1)
        .maybeSingle();
      if (error) toast.error("讀取失敗：" + error.message);
      const c = data?.content ?? "";
      setContent(c);
      setOriginal(c);
      setUpdatedAt(data?.updated_at ?? null);
      setLoading(false);
    })();
  }, [user, navigate]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("domain_knowledge")
      .update({ content, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error("儲存失敗：" + error.message);
      return;
    }
    setOriginal(content);
    setUpdatedAt(new Date().toISOString());
    toast.success("已儲存，AI 將在 1 分鐘內套用新版本");
  };

  const dirty = content !== original;
  const bgUrl = bgImages[themeIndex % bgImages.length];

  return (
    <div className="min-h-dvh w-full bg-cover bg-center" style={{ backgroundImage: `url(${bgUrl})` }}>
      <div className="min-h-dvh w-full backdrop-blur-sm bg-black/30 px-4 py-6 pb-24">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className={`h-5 w-5 ${t.authCardText}`} />
              <h1 className={`text-base font-semibold ${t.authCardText}`}>領域知識庫</h1>
            </div>
            <button
              onClick={() => navigate("/admin")}
              className={`text-xs flex items-center gap-1 ${t.authLink} hover:underline`}
            >
              <ArrowLeft className="h-3 w-3" /> 返回管理員
            </button>
          </div>

          <div className={`rounded-xl border backdrop-blur-md p-4 space-y-3 shadow-2xl ${t.authCard}`}>
            <p className={`text-xs ${t.authSubtext} leading-relaxed`}>
              這份內容會自動注入 AI 邀約、人脈分析、語音建檔三個 AI 功能的 system prompt，
              讓 AI 能正確辨識專有名詞與專業背景。修改後約 1 分鐘內生效。
            </p>
            {updatedAt && (
              <p className={`text-[11px] ${t.authSubtext}`}>
                最後更新：{new Date(updatedAt).toLocaleString("zh-TW")}
              </p>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className={`h-5 w-5 animate-spin ${t.authCardText}`} />
              </div>
            ) : (
              <>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={!isAdmin}
                  rows={24}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-mono leading-relaxed ${t.authCard} ${t.authCardText} resize-y`}
                  placeholder="輸入 AI 需要知道的領域背景、專有名詞、辨識規則..."
                />
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] ${t.authSubtext}`}>
                    {content.length} 字
                  </span>
                  <div className="flex gap-2">
                    {dirty && (
                      <button
                        onClick={() => setContent(original)}
                        disabled={saving}
                        className={`rounded-lg border px-3 py-2 text-xs ${t.authLink} hover:underline disabled:opacity-60`}
                      >
                        放棄變更
                      </button>
                    )}
                    <button
                      onClick={save}
                      disabled={!dirty || saving}
                      className="rounded-lg px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 bg-primary text-primary-foreground"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      儲存
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className={`rounded-xl border backdrop-blur-md p-4 space-y-2 shadow-2xl ${t.authCard}`}>
            <h2 className={`text-xs font-semibold ${t.authCardText}`}>編寫建議</h2>
            <ul className={`text-[11px] ${t.authSubtext} space-y-1 list-disc pl-4 leading-relaxed`}>
              <li>用「【區塊標題】」清楚分段（例如：領域背景、產品字典、辨識規則）。</li>
              <li>產品名稱用「名稱：說明」格式，一行一個，AI 才能精準對應。</li>
              <li>列出近音字 / 容易誤寫的版本，讓語音建檔能自動還原。</li>
              <li>用「絕對不要 / 不可捏造」等強語氣，避免 AI 自由發揮。</li>
              <li>不要寫醫療療效宣稱，僅描述產品定位與差異。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
