import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Infinity, Loader2 } from "lucide-react";
import bgGirl from "@/assets/bg-girl.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const themes = [
  {
    name: "🌸 少女活潑", emoji: "🌸", image: bgGirl,
    overlay: "from-pink-500/20 via-transparent to-purple-400/10",
    card: "border-pink-300/30 bg-white/60",
    cardText: "text-pink-900",
    label: "text-pink-700/70",
    input: "border-pink-200/60 bg-white/50 text-pink-900 placeholder:text-pink-400 focus:ring-pink-400/50",
    btn: { color: "hsl(330 70% 55%)", border: "hsl(330 70% 55% / 0.6)", bg: "hsl(330 70% 55% / 0.12)", hoverBg: "hsl(330 70% 55% / 0.25)", shadow: "hsl(330 70% 55% / 0.3)" },
    link: "text-pink-500 hover:text-pink-600",
    switcherActive: "bg-pink-400/30 ring-pink-400/50",
    titleColor: "#e879a0",
    titleGlow: "rgba(232,121,160,0.5)",
    subtext: "text-pink-800/60",
  },
  {
    name: "⚡ 青年勇猛", emoji: "⚡", image: bgYouth,
    overlay: "from-blue-900/40 via-transparent to-orange-600/10",
    card: "border-blue-400/30 bg-slate-900/70",
    cardText: "text-blue-50",
    label: "text-blue-300/70",
    input: "border-blue-500/40 bg-slate-800/60 text-blue-50 placeholder:text-blue-400/50 focus:ring-blue-400/50",
    btn: { color: "hsl(210 90% 65%)", border: "hsl(210 90% 60% / 0.6)", bg: "hsl(210 90% 60% / 0.15)", hoverBg: "hsl(210 90% 60% / 0.3)", shadow: "hsl(210 90% 60% / 0.4)" },
    link: "text-blue-400 hover:text-blue-300",
    switcherActive: "bg-blue-500/30 ring-blue-400/50",
    titleColor: "#60a5fa",
    titleGlow: "rgba(96,165,250,0.5)",
    subtext: "text-blue-200/60",
  },
  {
    name: "👑 中年旺盛", emoji: "👑", image: bgPrime,
    overlay: "from-amber-900/30 via-transparent to-emerald-900/10",
    card: "border-amber-500/30 bg-stone-950/75",
    cardText: "text-amber-50",
    label: "text-amber-300/70",
    input: "border-amber-600/40 bg-stone-900/60 text-amber-50 placeholder:text-amber-500/40 focus:ring-amber-500/50",
    btn: { color: "hsl(40 95% 64%)", border: "hsl(40 95% 55% / 0.6)", bg: "hsl(40 95% 55% / 0.12)", hoverBg: "hsl(40 95% 55% / 0.25)", shadow: "hsl(40 95% 55% / 0.4)" },
    link: "text-amber-400 hover:text-amber-300",
    switcherActive: "bg-amber-500/30 ring-amber-400/50",
    titleColor: "#fbbf24",
    titleGlow: "rgba(251,191,36,0.6)",
    subtext: "text-amber-200/60",
  },
  {
    name: "🌌 老年智慧", emoji: "🌌", image: bgWisdom,
    overlay: "from-indigo-900/30 via-transparent to-teal-800/10",
    card: "border-indigo-400/25 bg-indigo-950/70",
    cardText: "text-indigo-100",
    label: "text-indigo-300/70",
    input: "border-indigo-400/30 bg-indigo-900/40 text-indigo-100 placeholder:text-indigo-400/40 focus:ring-indigo-400/50",
    btn: { color: "hsl(260 60% 72%)", border: "hsl(260 60% 65% / 0.5)", bg: "hsl(260 60% 65% / 0.12)", hoverBg: "hsl(260 60% 65% / 0.25)", shadow: "hsl(260 60% 65% / 0.35)" },
    link: "text-indigo-300 hover:text-indigo-200",
    switcherActive: "bg-indigo-400/30 ring-indigo-400/50",
    titleColor: "#a5b4fc",
    titleGlow: "rgba(165,180,252,0.5)",
    subtext: "text-indigo-200/60",
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

  const t = themes[bgIndex];

  const fieldClass = `w-full rounded-lg border px-3 py-2.5 text-sm backdrop-blur-sm focus:outline-none focus:ring-1 transition-colors ${t.input}`;

  const btnStyle: React.CSSProperties = {
    color: t.btn.color,
    border: `1px solid ${t.btn.border}`,
    background: t.btn.bg,
    boxShadow: `0 0 14px -2px ${t.btn.shadow}, inset 0 0 12px -6px ${t.btn.shadow}`,
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background images */}
      {themes.map((bg, i) => (
        <div
          key={bg.name}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === bgIndex ? 1 : 0 }}
        >
          <img src={bg.image} alt={bg.name} className="absolute inset-0 w-full h-full object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-b ${bg.overlay}`} />
          <div className="absolute inset-0 bg-black/35" />
        </div>
      ))}

      {/* Background switcher */}
      <div className="fixed top-4 right-4 z-20">
        <div className="flex gap-1 rounded-xl border border-white/10 bg-black/30 backdrop-blur-md px-2 py-1.5">
          {themes.map((bg, i) => (
            <button
              key={bg.name}
              onClick={() => setBgIndex(i)}
              title={bg.name}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-200 ${
                i === bgIndex ? `${bg.switcherActive} ring-1 scale-110` : "hover:bg-white/10"
              }`}
            >
              {bg.emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm space-y-6 animate-fade-in relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-24 w-24 items-center justify-center" style={{ filter: `drop-shadow(0 0 20px ${t.titleGlow})` }}>
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
            <span style={{ color: t.titleColor, textShadow: `0 0 16px ${t.titleGlow}` }}>
              RICH系統
            </span>
            <span className={`ml-2 font-normal ${t.cardText}`}>名單管理</span>
          </h1>
        </div>

        {/* Form card */}
        <div className={`rounded-xl border backdrop-blur-md p-6 space-y-4 shadow-2xl transition-colors duration-500 ${t.card}`}>
          <h2 className={`text-base font-medium text-center ${t.cardText}`}>
            {isLogin ? "登入帳號" : "建立帳號"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div>
                <label className={`text-xs mb-1.5 block ${t.label}`}>姓名</label>
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
              <label className={`text-xs mb-1.5 block ${t.label}`}>Email</label>
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
              <label className={`text-xs mb-1.5 block ${t.label}`}>密碼</label>
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
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50"
              style={btnStyle}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = t.btn.hoverBg; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = t.btn.bg; }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLogin ? "登入" : "註冊"}
            </button>
          </form>

          <p className={`text-center text-xs ${t.subtext}`}>
            {isLogin ? "還沒有帳號？" : "已有帳號？"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className={`${t.link} ml-1 underline-offset-2 hover:underline`}
            >
              {isLogin ? "立即註冊" : "返回登入"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
