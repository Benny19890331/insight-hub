import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Infinity, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useTheme, ThemeSwitcher, themes } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";
import bgGirl from "@/assets/bg-girl.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgViolet from "@/assets/bg-violet.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const bgImages = [bgGirl, bgViolet, bgYouth, bgPrime, bgWisdom];

const getPasswordStrength = (pwd: string) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { label: "弱", color: "text-red-400" };
  if (score <= 3) return { label: "中", color: "text-yellow-400" };
  return { label: "強", color: "text-green-400" };
};

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [done, setDone] = useState(false);
  const { themeIndex, theme: t } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    // When user clicks the reset link, Supabase automatically exchanges the token
    // and creates a session. We listen for PASSWORD_RECOVERY or check existing session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasSession(true);
        setVerifying(false);
      }
    });

    // Also check if session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      }
      setVerifying(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("密碼至少需要 6 個字元");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("兩次輸入的密碼不一致");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
      toast.success("密碼更新成功！");
      await supabase.auth.signOut();
      setTimeout(() => navigate("/auth"), 2500);
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

  const passwordStrength = getPasswordStrength(password);
  const passwordMatched = confirmPassword.length > 0 && password === confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {bgImages.map((img, i) => (
        <div key={i} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === themeIndex ? 1 : 0 }}>
          <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-b ${themes[i].authOverlay}`} />
          <div className="absolute inset-0 bg-black/55" />
        </div>
      ))}

      <div className="fixed right-4 z-20" style={{ top: "calc(env(safe-area-inset-top, 0px) + 10px)" }}>
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-sm space-y-6 animate-fade-in relative z-10">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-32 w-32 items-center justify-center" style={{ filter: `drop-shadow(0 0 24px ${t.titleGlow}) drop-shadow(0 4px 8px rgba(0,0,0,0.3))`, perspective: "200px" }}>
            <div className="relative" style={{ transform: "rotateX(12deg) rotateY(-8deg)", transformStyle: "preserve-3d" }}>
              <Infinity className="h-28 w-28" style={{ stroke: "url(#updatePwdGrad)", strokeWidth: 2.2, filter: "drop-shadow(2px 4px 3px rgba(0,0,0,0.4)) drop-shadow(-1px -1px 0px rgba(255,255,255,0.15))" }} />
            </div>
            <svg width="0" height="0">
              <defs>
                <linearGradient id="updatePwdGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e8e8e8"><animate attributeName="stop-color" values="#e8e8e8;#f5e6a0;#ffffff;#f5e6a0;#e8e8e8" dur="3s" repeatCount="indefinite" /></stop>
                  <stop offset="50%" stopColor="#ffffff"><animate attributeName="stop-color" values="#ffffff;#f5e6a0;#c0c0c0;#f5e6a0;#ffffff" dur="3s" repeatCount="indefinite" /></stop>
                  <stop offset="100%" stopColor="#c0c0c0"><animate attributeName="stop-color" values="#c0c0c0;#f5e6a0;#ffffff;#f5e6a0;#c0c0c0" dur="3s" repeatCount="indefinite" /></stop>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold">
            <span style={{ color: t.titleColor, textShadow: `0 0 16px ${t.titleGlow}` }}>RICH系統</span>
            <span className={`ml-2 font-normal ${t.authCardText}`}>更新密碼</span>
          </h1>
        </div>

        <div className={`rounded-xl border backdrop-blur-md p-6 space-y-4 shadow-2xl transition-colors duration-500 ${t.authCard}`}>
          {verifying ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className={`h-8 w-8 animate-spin ${t.authSubtext}`} />
              <p className={`text-sm ${t.authSubtext}`}>驗證連結中⋯</p>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="h-10 w-10 text-green-400" />
              <p className={`text-sm ${t.authCardText}`}>密碼已更新成功！</p>
              <p className={`text-xs ${t.authSubtext}`}>即將跳轉至登入頁⋯</p>
            </div>
          ) : !hasSession ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className={`text-sm ${t.authCardText}`}>重設連結已過期或無效</p>
              <button onClick={() => navigate("/auth")} className={`text-sm ${t.authLink} underline`}>返回登入頁</button>
            </div>
          ) : (
            <>
              <h2 className={`text-base font-medium text-center ${t.authCardText}`}>設定新密碼</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className={`text-xs mb-1.5 block ${t.authLabel}`}>新密碼</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 個字元" className={`${fieldClass} pr-10`} required minLength={6} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${t.authSubtext}`}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className={`text-[11px] mt-1 ${passwordStrength.color}`}>密碼強度：{passwordStrength.label}</p>
                </div>
                <div>
                  <label className={`text-xs mb-1.5 block ${t.authLabel}`}>確認密碼</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次輸入密碼" className={`${fieldClass} pr-10`} required minLength={6} />
                    <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${t.authSubtext}`}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <p className={`text-[11px] mt-1 ${passwordMatched ? "text-green-400" : "text-red-400"}`}>
                      {passwordMatched ? "密碼一致" : "密碼不一致"}
                    </p>
                  )}
                </div>
                <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50" style={btnStyle}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = t.btnPrimary.hoverBg; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = t.btnPrimary.bg; }}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  更新密碼
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
