import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Infinity, Loader2 } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message === "Invalid login credentials" ? "帳號或密碼錯誤" : error.message);
      }
    } else {
      if (!displayName.trim()) {
        toast.error("請輸入您的姓名");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("註冊成功！請查收驗證信件後再登入。");
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  const fieldClass =
    "w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center">
            <Infinity className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-lg font-semibold">
            <span className="text-amber-400" style={{ textShadow: "0 0 8px rgba(251,191,36,0.4)" }}>
              RICH系統
            </span>
            <span className="text-foreground ml-1.5 font-normal">名單管理</span>
          </h1>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-base font-medium text-center text-foreground">
            {isLogin ? "登入帳號" : "建立帳號"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">姓名</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="您的姓名"
                  className={fieldClass}
                  required
                />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={fieldClass}
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 個字元"
                className={fieldClass}
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="neon-btn-cyan w-full justify-center disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLogin ? "登入" : "註冊"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            {isLogin ? "還沒有帳號？" : "已有帳號？"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline ml-1"
            >
              {isLogin ? "立即註冊" : "返回登入"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
