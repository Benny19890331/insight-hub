import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Infinity, Loader2 } from "lucide-react";
import bgGirl from "@/assets/bg-girl.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const backgrounds = [
  { name: "🌸 少女活潑", emoji: "🌸", image: bgGirl, overlay: "from-pink-500/20 via-transparent to-purple-400/10" },
  { name: "⚡ 青年勇猛", emoji: "⚡", image: bgYouth, overlay: "from-blue-900/40 via-transparent to-orange-600/10" },
  { name: "👑 中年旺盛", emoji: "👑", image: bgPrime, overlay: "from-amber-900/30 via-transparent to-emerald-900/10" },
  { name: "🌌 老年智慧", emoji: "🌌", image: bgWisdom, overlay: "from-indigo-900/30 via-transparent to-teal-800/10" },
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
    "w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 backdrop-blur-sm";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background images - all preloaded, toggle visibility */}
      {backgrounds.map((bg, i) => (
        <div
          key={bg.name}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === bgIndex ? 1 : 0 }}
        >
          <img
            src={bg.image}
            alt={bg.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className={`absolute inset-0 bg-gradient-to-b ${bg.overlay}`} />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      ))}

      {/* Background switcher */}
      <div className="fixed top-4 right-4 z-20">
        <div className="flex gap-1 rounded-xl border border-border/50 bg-card/60 backdrop-blur-md px-2 py-1.5">
          {backgrounds.map((bg, i) => (
            <button
              key={bg.name}
              onClick={() => setBgIndex(i)}
              title={bg.name}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-200 ${
                i === bgIndex
                  ? "bg-primary/20 ring-1 ring-primary/50 scale-110"
                  : "hover:bg-muted/50"
              }`}
            >
              {bg.emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm space-y-6 animate-fade-in relative z-10">
        {/* Logo with metallic gradient - enlarged */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-24 w-24 items-center justify-center drop-shadow-[0_0_20px_rgba(240,230,140,0.3)]">
            <Infinity className="h-20 w-20" style={{ stroke: 'url(#authMetalGrad)', strokeWidth: 1.8 }} />
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
          <h1 className="text-2xl font-semibold">
            <span className="text-amber-400 glow-text" style={{ textShadow: "0 0 16px rgba(251,191,36,0.6)" }}>
              RICH系統
            </span>
            <span className="text-foreground ml-2 font-normal">名單管理</span>
          </h1>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border/50 bg-card/70 backdrop-blur-md p-6 space-y-4 shadow-2xl">
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
