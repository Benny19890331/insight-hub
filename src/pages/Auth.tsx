import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Infinity, Loader2, Palette } from "lucide-react";

const backgrounds = [
  {
    name: "深空",
    class: "bg-background",
    style: {},
  },
  {
    name: "星雲",
    class: "",
    style: {
      background: "radial-gradient(ellipse at 20% 50%, hsl(260 60% 15%) 0%, hsl(220 20% 7%) 50%, hsl(200 40% 10%) 100%)",
    },
  },
  {
    name: "極光",
    class: "",
    style: {
      background: "linear-gradient(135deg, hsl(220 30% 8%) 0%, hsl(168 40% 10%) 40%, hsl(260 30% 12%) 70%, hsl(220 20% 7%) 100%)",
    },
  },
  {
    name: "熔岩",
    class: "",
    style: {
      background: "radial-gradient(ellipse at 70% 80%, hsl(15 60% 12%) 0%, hsl(0 40% 8%) 40%, hsl(220 20% 7%) 100%)",
    },
  },
  {
    name: "海洋",
    class: "",
    style: {
      background: "linear-gradient(180deg, hsl(220 30% 7%) 0%, hsl(210 50% 10%) 50%, hsl(200 60% 12%) 100%)",
    },
  },
  {
    name: "黃金",
    class: "",
    style: {
      background: "radial-gradient(ellipse at 50% 30%, hsl(40 50% 12%) 0%, hsl(30 30% 8%) 50%, hsl(220 20% 7%) 100%)",
    },
  },
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

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

  const currentBg = backgrounds[bgIndex];

  const fieldClass =
    "w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 transition-all duration-700 ${currentBg.class}`}
      style={currentBg.style}
    >
      {/* Background switcher */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-10">
        <div className="flex gap-1.5 rounded-lg border border-border bg-card/80 backdrop-blur-sm px-2 py-1.5">
          {backgrounds.map((bg, i) => (
            <button
              key={bg.name}
              onClick={() => setBgIndex(i)}
              title={bg.name}
              className={`w-6 h-6 rounded-md border transition-all duration-200 text-[9px] font-medium flex items-center justify-center ${
                i === bgIndex
                  ? "border-primary ring-1 ring-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground/50"
              }`}
            >
              {bg.name[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        {/* Logo with metallic gradient */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center">
            <Infinity className="h-16 w-16" style={{ stroke: 'url(#authMetalGrad)', strokeWidth: 2 }} />
            <svg width="0" height="0">
              <defs>
                <linearGradient id="authMetalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#b0b0b0">
                    <animate attributeName="stop-color" values="#b0b0b0;#f0e68c;#ffffff;#f0e68c;#b0b0b0" dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="33%" stopColor="#f0e68c">
                    <animate attributeName="stop-color" values="#f0e68c;#ffffff;#f0e68c;#b0b0b0;#f0e68c" dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="66%" stopColor="#ffffff">
                    <animate attributeName="stop-color" values="#ffffff;#f0e68c;#b0b0b0;#f0e68c;#ffffff" dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#f0e68c">
                    <animate attributeName="stop-color" values="#f0e68c;#b0b0b0;#f0e68c;#ffffff;#f0e68c" dur="3s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="text-xl font-semibold">
            <span className="text-amber-400 glow-text" style={{ textShadow: "0 0 12px rgba(251,191,36,0.5)" }}>
              RICH系統
            </span>
            <span className="text-foreground ml-2 font-normal">名單管理</span>
          </h1>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6 space-y-4">
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
