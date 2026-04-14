import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCanonicalAppUrl } from "@/lib/app-url";
import { useTheme, themes } from "@/hooks/useTheme";
import { ArrowLeft, Shield, ShieldOff, Loader2, Users, Crown, Mail, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import bgGirl from "@/assets/bg-girl.jpg";
import bgViolet from "@/assets/bg-violet.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const bgImages = [bgGirl, bgViolet, bgYouth, bgPrime, bgWisdom];

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastSignIn: string | null;
  isBanned: boolean;
  isAdmin: boolean;
  contactCount: number;
  memberCode: string | null;
}


const activeLevel = (u: AdminUser): { label: string; color: string } => {
  const lastDays = u.lastSignIn ? Math.floor((Date.now() - new Date(u.lastSignIn).getTime()) / (1000 * 60 * 60 * 24)) : 999;
  if (lastDays <= 2) return { label: "高活躍", color: "text-green-400 border-green-500/40 bg-green-500/10" };
  if (lastDays <= 7) return { label: "中活躍", color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10" };
  if (lastDays <= 30) return { label: "低活躍", color: "text-blue-400 border-blue-500/40 bg-blue-500/10" };
  return { label: "沉睡", color: "text-gray-400 border-gray-500/40 bg-gray-500/10" };
};

export default function AdminDashboard() {
  const { theme: t, themeIndex } = useTheme();
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const appBaseUrl = getCanonicalAppUrl();

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "1596886") {
      setAuthenticated(true);
      loadUsers();
    } else {
      toast.error("密碼錯誤");
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_users" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUsers(data.users ?? []);
    } catch (err: any) {
      toast.error(err.message || "載入使用者失敗");
      if (err.message === "Forbidden") {
        navigate("/");
      }
    }
    setLoading(false);
  };

  const toggleBan = async (targetUserId: string, ban: boolean) => {
    setToggling(targetUserId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "toggle_ban", targetUserId, ban },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, isBanned: ban } : u))
      );
      toast.success(ban ? "已停權" : "已恢復");
    } catch (err: any) {
      toast.error(err.message || "操作失敗");
    }
    setToggling(null);
  };

  const toggleAdmin = async (targetUserId: string, grant: boolean) => {
    setToggling(targetUserId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "toggle_admin", targetUserId, grant },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, isAdmin: grant } : u))
      );
      toast.success(grant ? "已授權管理員" : "已移除管理員");
    } catch (err: any) {
      toast.error(err.message || "操作失敗");
    }
    setToggling(null);
  };

  const sendResetPasswordEmail = async (targetUserId: string, targetEmail: string) => {
    setToggling(targetUserId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "send_password_reset_email",
          targetUserId,
          targetEmail,
          redirectTo: `${appBaseUrl}/auth`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("已寄送重設密碼信");
    } catch (err: any) {
      toast.error(err.message || "寄送失敗");
    }
    setToggling(null);
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setToggling(deleteTarget);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete_user", targetUserId: deleteTarget },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget));
      toast.success("使用者已刪除");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || "刪除失敗");
    }
    setToggling(null);
  };

  const fieldClass = `w-full rounded-lg border px-3 py-2.5 text-sm backdrop-blur-sm focus:outline-none focus:ring-1 transition-colors ${t.authInput}`;


  const btnStyle: React.CSSProperties = {
    color: t.btnPrimary.color,
    border: `1px solid ${t.btnPrimary.border}`,
    background: t.btnPrimary.bg,
    boxShadow: `0 0 14px -2px ${t.btnPrimary.shadow}`,
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (u.displayName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q) || (u.memberCode || "").toLowerCase().includes(q);
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const adminCount = users.filter((u) => u.isAdmin).length;
  const bannedCount = users.filter((u) => u.isBanned).length;
  const activeCount = users.length - bannedCount;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {bgImages.map((img, i) => (
        <div key={i} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === themeIndex ? 1 : 0 }}>
          <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-b ${themes[i].authOverlay}`} />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      ))}

      <div className="w-full max-w-2xl relative z-10">
        {!authenticated ? (
          <div className={`rounded-xl border backdrop-blur-md p-6 space-y-4 shadow-2xl ${t.authCard} max-w-sm mx-auto`}>
            <div className="flex items-center gap-2 justify-center">
              <Shield className="h-5 w-5" style={{ color: t.titleColor }} />
              <h2 className={`text-base font-semibold ${t.authCardText}`}>管理員驗證</h2>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入管理員密碼"
                className={fieldClass}
                autoFocus
                required
              />
              <button type="submit" className="w-full rounded-lg px-3.5 py-2.5 text-sm font-semibold cursor-pointer" style={btnStyle}>
                驗證
              </button>
            </form>
            <button onClick={() => navigate("/")} className={`text-xs ${t.authLink} hover:underline w-full text-center`}>
              返回
            </button>
          </div>
        ) : (
          <div className={`rounded-xl border backdrop-blur-md p-6 space-y-4 shadow-2xl ${t.authCard}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" style={{ color: t.titleColor }} />
                <h2 className={`text-base font-semibold ${t.authCardText}`}>
                  註冊使用者 ({filteredUsers.length}/{users.length})
                </h2>
              </div>
              <button onClick={() => navigate("/")} className={`text-xs flex items-center gap-1 ${t.authLink} hover:underline`}>
                <ArrowLeft className="h-3 w-3" /> 返回
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className={`rounded-lg border px-3 py-2 ${t.authCard}`}>
                <div className={t.authSubtext}>有效使用者</div>
                <div className={`text-base font-semibold ${t.authCardText}`}>{activeCount}</div>
              </div>
              <div className={`rounded-lg border px-3 py-2 ${t.authCard}`}>
                <div className={t.authSubtext}>管理員</div>
                <div className={`text-base font-semibold ${t.authCardText}`}>{adminCount}</div>
              </div>
              <div className={`rounded-lg border px-3 py-2 ${t.authCard}`}>
                <div className={t.authSubtext}>已停權</div>
                <div className={`text-base font-semibold ${t.authCardText}`}>{bannedCount}</div>
              </div>
            </div>

            {/* Search bar */}
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋姓名、Email、會員編號..."
                className={fieldClass}
              />
              <button
                onClick={loadUsers}
                disabled={loading}
                className="rounded-lg border px-3 py-2 text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                style={btnStyle}
                title="重新整理"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} 重新整理
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: t.titleColor }} />
              </div>
            ) : users.length === 0 ? (
              <p className={`text-center text-sm py-8 ${t.authSubtext}`}>目前沒有其他使用者</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className={`rounded-lg border px-4 py-3 transition-colors space-y-2 ${t.authCard} ${u.isBanned ? "opacity-60" : ""}`}
                  >
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${t.authCardText}`}>
                        {u.displayName || "(未命名)"}
                        {u.isAdmin && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: `${t.titleColor}22`, color: t.titleColor }}>管理員</span>
                        )}
                        {u.isBanned && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">已停權</span>
                        )}
                      </div>
                      <div className={`text-xs ${t.authSubtext}`}>{u.email}</div>
                      {u.memberCode && <div className={`text-xs ${t.authSubtext}`}>會員編號：{u.memberCode}</div>}
                      <div className={`text-xs ${t.authSubtext} flex flex-wrap items-center gap-x-2`}>
                        <span>註冊: {new Date(u.createdAt).toLocaleDateString("zh-TW")}</span>
                        {u.lastSignIn && <span>最後登入: {new Date(u.lastSignIn).toLocaleDateString("zh-TW")}</span>}
                        <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border font-medium ${activeLevel(u).color}`}>
                          {activeLevel(u).label}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border font-medium border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
                          名單總數 {u.contactCount}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: safe actions */}
                      <div className="flex flex-col gap-2">
                         <button
                           onClick={() => sendResetPasswordEmail(u.id, u.email)}
                           disabled={toggling === u.id}
                           className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                           title="寄送重設密碼信"
                         >
                           <Mail className="h-3 w-3" />
                           寄送重設信
                         </button>
                         <button
                           onClick={() => toggleAdmin(u.id, !u.isAdmin)}
                           disabled={toggling === u.id}
                           className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                             u.isAdmin
                               ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                               : "border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                           }`}
                           title={u.isAdmin ? "移除管理員" : "設為管理員"}
                         >
                           {toggling === u.id ? (
                             <Loader2 className="h-3 w-3 animate-spin" />
                           ) : (
                             <Crown className="h-3 w-3" />
                           )}
                           {u.isAdmin ? "取消" : "授權"}
                         </button>
                       </div>
                       {/* Right: dangerous actions */}
                       <div className="flex flex-col gap-2 items-end">
                         <button
                           onClick={() => toggleBan(u.id, !u.isBanned)}
                           disabled={toggling === u.id}
                           className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                             u.isBanned
                               ? "border-green-500/30 text-green-400 hover:bg-green-500/10"
                               : "border-red-500/30 text-red-400 hover:bg-red-500/10"
                           }`}
                         >
                           {toggling === u.id ? (
                             <Loader2 className="h-3 w-3 animate-spin" />
                           ) : u.isBanned ? (
                             <Shield className="h-3 w-3" />
                           ) : (
                             <ShieldOff className="h-3 w-3" />
                           )}
                           {u.isBanned ? "恢復" : "停權"}
                         </button>
                         <button
                           onClick={() => setDeleteTarget(u.id)}
                           disabled={toggling === u.id}
                           className="inline-flex items-center gap-1 rounded-lg border border-red-600/40 text-red-500 hover:bg-red-600/20 px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                           title="刪除帳號"
                         >
                           <Trash2 className="h-3 w-3" />
                           刪除
                         </button>
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete user confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`rounded-xl border backdrop-blur-md p-6 space-y-4 shadow-2xl ${t.authCard} w-full max-w-sm mx-4`}>
            <h3 className={`text-sm font-semibold ${t.authCardText}`}>
              確認刪除帳號
            </h3>
            <p className={`text-xs ${t.authSubtext}`}>
              您確定要刪除「{users.find(u => u.id === deleteTarget)?.displayName || users.find(u => u.id === deleteTarget)?.email}」嗎？此操作無法復原，該使用者的所有資料將被永久刪除。
            </p>
            <div className="flex gap-2">
              <button
                onClick={deleteUser}
                disabled={toggling === deleteTarget}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50 bg-red-600 hover:bg-red-700 text-white border-0"
              >
                {toggling === deleteTarget ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "確認刪除"}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${t.authLink} hover:underline`}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
