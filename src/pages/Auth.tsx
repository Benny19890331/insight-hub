import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Infinity, Loader2 } from "lucide-react";
import { useTheme, ThemeSwitcher, themes } from "@/hooks/useTheme";
import bgGirl from "@/assets/bg-girl.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const bgImages = [bgGirl, bgYouth, bgPrime, bgWisdom];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { themeIndex, theme: t } = useTheme();

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

  const fieldClass = `w-full rounded-lg border px-3 py-2.5 text-sm backdrop-blur-sm focus:outline-none focus:ring-1 transition-colors ${t.authInput}`;

  const btnStyle: React.CSSProperties = {
    color: t.btnPrimary.color,
    border: `1px solid ${t.btnPrimary.border}`,
    background: t.btnPrimary.bg,
    boxShadow: `0 0 14px -2px ${t.btnPrimary.shadow}, inset 0 0 12px -6px ${t.btnPrimary.shadow}`,
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background images */}
      {bgImages.map((img, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === themeIndex ? 1 : 0 }}
        >
          <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-b ${themes[i].authOverlay}`} />
          <div className="absolute inset-0 bg-black/35" />
        </div>
      ))}

      {/* Theme switcher */}
      <div className="fixed top-4 right-4 z-20">
        <ThemeSwitcher />
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
            <span style={{ color: t.titleColor, textShadow: `0 0 16px ${t.titleGlow}` }}>RICH系統</span>
            <span className={`ml-2 font-normal ${t.authCardText}`}>名單管理系統</span>
          </h1>
        </div>

        {/* Form card */}
        <div className={`rounded-xl border backdrop-blur-md p-6 space-y-4 shadow-2xl transition-colors duration-500 ${t.authCard}`}>
          <h2 className={`text-base font-medium text-center ${t.authCardText}`}>
            {isLogin ? "登入帳號" : "建立帳號"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div>
                <label className={`text-xs mb-1.5 block ${t.authLabel}`}>姓名</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="您的姓名" className={fieldClass} required />
              </div>
            )}
            <div>
              <label className={`text-xs mb-1.5 block ${t.authLabel}`}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={fieldClass} required />
            </div>
            <div>
              <label className={`text-xs mb-1.5 block ${t.authLabel}`}>密碼</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 個字元" className={fieldClass} required minLength={6} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50"
              style={btnStyle}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = t.btnPrimary.hoverBg; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = t.btnPrimary.bg; }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLogin ? "登入" : "註冊"}
            </button>
          </form>

          <p className={`text-center text-xs ${t.authSubtext}`}>
            {isLogin ? "還沒有帳號？" : "已有帳號？"}
            <button onClick={() => setIsLogin(!isLogin)} className={`${t.authLink} ml-1 underline-offset-2 hover:underline`}>
              {isLogin ? "立即註冊" : "返回登入"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
