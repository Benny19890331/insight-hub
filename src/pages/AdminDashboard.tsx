import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme, themes } from "@/hooks/useTheme";
import { ArrowLeft, Shield, ShieldOff, Loader2, Users, Crown, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import bgGirl from "@/assets/bg-girl.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const bgImages = [bgGirl, bgYouth, bgPrime, bgWisdom];

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastSignIn: string | null;
  isBanned: boolean;
  isAdmin: boolean;
}

export default function AdminDashboard() {
  const { theme: t, themeIndex } = useTheme();
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState("");

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

  const resetPassword = async () => {
    if (!resetTarget || newPwd.length < 6) {
      toast.error("密碼至少需要 6 個字元");
      return;
    }
    setToggling(resetTarget);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "reset_password", targetUserId: resetTarget, newPassword: newPwd },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("密碼已重設");
      setResetTarget(null);
      setNewPwd("");
    } catch (err: any) {
      toast.error(err.message || "重設失敗");
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
                  註冊使用者 ({users.length})
                </h2>
              </div>
              <button onClick={() => navigate("/")} className={`text-xs flex items-center gap-1 ${t.authLink} hover:underline`}>
                <ArrowLeft className="h-3 w-3" /> 返回
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
                {users.map((u) => (
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
                      <div className={`text-xs ${t.authSubtext}`}>
                        註冊: {new Date(u.createdAt).toLocaleDateString("zh-TW")}
                        {u.lastSignIn && ` · 最後登入: ${new Date(u.lastSignIn).toLocaleDateString("zh-TW")}`}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => { setResetTarget(u.id); setNewPwd(""); }}
                        disabled={toggling === u.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                        title="重設密碼"
                      >
                        <KeyRound className="h-3 w-3" />
                        重設密碼
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
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`rounded-xl border backdrop-blur-md p-6 space-y-4 shadow-2xl ${t.authCard} w-full max-w-sm mx-4`}>
            <h3 className={`text-sm font-semibold ${t.authCardText}`}>
              重設密碼 — {users.find(u => u.id === resetTarget)?.displayName || users.find(u => u.id === resetTarget)?.email}
            </h3>
            <input
              type="text"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="輸入新密碼（至少 6 字元）"
              className={fieldClass}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={resetPassword}
                disabled={toggling === resetTarget || newPwd.length < 6}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
                style={btnStyle}
              >
                {toggling === resetTarget ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "確認重設"}
              </button>
              <button
                onClick={() => { setResetTarget(null); setNewPwd(""); }}
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
