import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Infinity, Loader2, Download, Eye, EyeOff } from "lucide-react";
import { useTheme, ThemeSwitcher, themes } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
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

const suggestEmailTypo = (value: string) => {
  const lower = value.toLowerCase();
  if (lower.endsWith("@gamil.com")) return value.replace(/@gamil\.com$/i, "@gmail.com");
  if (lower.endsWith("@gmial.com")) return value.replace(/@gmial\.com$/i, "@gmail.com");
  if (lower.endsWith("@hotnail.com")) return value.replace(/@hotnail\.com$/i, "@hotmail.com");
  return null;
};

const mapAuthError = (message: string) => {
  if (message === "Invalid login credentials") return "帳號或密碼錯誤";
  if (message.includes("email signups are disabled")) return "目前系統已關閉 Email 註冊，請聯絡管理員。";
  if (message.includes("User already registered")) return "這個 Email 已經註冊過了，請直接登入。";
  if (message.includes("Password should be at least")) return "密碼長度不足，請至少 6 碼。";
  if (message.includes("Email rate limit exceeded") || message.includes("over_email_send_rate_limit")) return "寄信次數過多，請稍後再試。";
  return message;
};

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const { themeIndex, theme: t } = useTheme();
  const { recoveryMode, setRecoveryMode } = useAuth();

  useEffect(() => {
    const isIosDevice = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsIos(isIosDevice);
    setIsStandalone(!!standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // FIX: Handle token_hash from email link (bypasses Lovable link tracking)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (tokenHash && type === "recovery") {
      setLoading(true);
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(({ error }) => {
          if (error) {
            toast.error("重設連結已過期或無效，請重新申請。");
            console.error("verifyOtp error:", error.message);
          } else {
            setRecoveryMode(true);
            toast.success("驗證成功，請設定新密碼。");
          }
          // Clean up URL params
          window.history.replaceState({}, "", window.location.pathname);
          setLoading(false);
        });
    }
  }, []);


  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("請先輸入 Email");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${appBaseUrl}/auth`,
    });
    if (error) {
      toast.error(mapAuthError(error.message));
    } else {
      toast.success("重設密碼信已寄出，請到信箱查看");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (recoveryMode) {
      if (password.length < 6) {
        toast.error("密碼至少需要 6 個字元");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        toast.error("兩次輸入的密碼不一致");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(mapAuthError(error.message));
      } else {
        toast.success("密碼已更新，請重新登入");
        setRecoveryMode(false);
        await supabase.auth.signOut();
        setIsLogin(true);
        setPassword("");
        setConfirmPassword("");
      }
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(mapAuthError(error.message));
      }
    } else {
      if (!displayName.trim()) {
        toast.error("請輸入您的姓名");
        setLoading(false);
        return;
      }
      if (!memberCode.trim()) {
        toast.error("請輸入會員編號");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        toast.error("兩次輸入的密碼不一致，請確認後再試");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim(), member_code: memberCode.trim() },
        },
      });
      if (error) {
        toast.error(mapAuthError(error.message));
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          toast.info("註冊成功！請到信箱收取驗證信後再登入。");
          setIsLogin(true);
        } else {
          toast.success("註冊成功，已自動登入。");
        }
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


  const passwordStrength = getPasswordStrength(password);
  const passwordMatched = confirmPassword.length > 0 && password === confirmPassword;
  const emailSuggestion = suggestEmailTypo(email);
  const appBaseUrl = ((import.meta as any).env?.VITE_APP_URL || window.location.origin).replace(/\/$/, "");

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
          <div className="absolute inset-0 bg-black/55" />
        </div>
      ))}

      {/* Theme switcher */}
      <div className="fixed right-4 z-20" style={{ top: "calc(env(safe-area-inset-top, 0px) + 10px)" }}>
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-sm space-y-6 animate-fade-in relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-32 w-32 items-center justify-center"
            style={{
              filter: `drop-shadow(0 0 24px ${t.titleGlow}) drop-shadow(0 4px 8px rgba(0,0,0,0.3))`,
              perspective: "200px",
            }}
          >
            <div
              className="relative"
              style={{
                transform: "rotateX(12deg) rotateY(-8deg)",
                transformStyle: "preserve-3d",
              }}
            >
              <Infinity
                className="h-28 w-28"
                style={{
                  stroke: 'url(#authMetalGrad)',
                  strokeWidth: 2.2,
                  filter: 'drop-shadow(2px 4px 3px rgba(0,0,0,0.4)) drop-shadow(-1px -1px 0px rgba(255,255,255,0.15))',
                }}
              />
              {/* Shadow layer for depth */}
              <Infinity
                className="h-28 w-28 absolute inset-0"
                style={{
                  stroke: 'rgba(0,0,0,0.2)',
                  strokeWidth: 3,
                  transform: 'translateZ(-4px) translateX(2px) translateY(3px)',
                  filter: 'blur(3px)',
                }}
              />
            </div>
            <svg width="0" height="0">
              <defs>
                <linearGradient id="authMetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e8e8e8">
                    <animate attributeName="stop-color" values="#e8e8e8;#f5e6a0;#ffffff;#f5e6a0;#e8e8e8" dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="25%" stopColor="#f5e6a0">
                    <animate attributeName="stop-color" values="#f5e6a0;#ffffff;#f5e6a0;#c0c0c0;#f5e6a0" dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="50%" stopColor="#ffffff">
                    <animate attributeName="stop-color" values="#ffffff;#f5e6a0;#c0c0c0;#f5e6a0;#ffffff" dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="75%" stopColor="#f5e6a0">
                    <animate attributeName="stop-color" values="#f5e6a0;#c0c0c0;#f5e6a0;#ffffff;#f5e6a0" dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#c0c0c0">
                    <animate attributeName="stop-color" values="#c0c0c0;#f5e6a0;#ffffff;#f5e6a0;#c0c0c0" dur="3s" repeatCount="indefinite" />
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
            {recoveryMode ? "設定新密碼" : (isLogin ? "登入帳號" : "建立帳號")}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && !recoveryMode && <p className={`text-[11px] ${t.authSubtext}`}>* 建立帳號欄位皆為必填</p>}
            {(!isLogin || recoveryMode) && (
              <div>
                <label className={`text-xs mb-1.5 block ${t.authLabel}`}>姓名</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="您的姓名" className={fieldClass} required autoComplete="name" />
              </div>
            )}
            {(!isLogin || recoveryMode) && (
              <div>
                <label className={`text-xs mb-1.5 block ${t.authLabel}`}>會員編號（必填）</label>
                <input
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
                  placeholder="例如 A001"
                  className={fieldClass}
                  required
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </div>
            )}
            {!recoveryMode && <div>
              <label className={`text-xs mb-1.5 block ${t.authLabel}`}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={fieldClass} required autoComplete="email" inputMode="email" autoCapitalize="none" />
              {emailSuggestion && <p className={`text-[11px] mt-1 ${t.authSubtext}`}>你是不是想輸入：<button type="button" className={`${t.authLink} underline`} onClick={() => setEmail(emailSuggestion)}>{emailSuggestion}</button></p>}
            </div>}
            <div>
              <label className={`text-xs mb-1.5 block ${t.authLabel}`}>{recoveryMode ? "新密碼" : "密碼"}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 個字元"
                  className={`${fieldClass} pr-10`}
                  required
                  minLength={6}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${t.authSubtext}`}
                  aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!isLogin && <p className={`text-[11px] mt-1 ${passwordStrength.color}`}>密碼強度：{passwordStrength.label}</p>}
            </div>

            {!isLogin && (
              <div>
                <label className={`text-xs mb-1.5 block ${t.authLabel}`}>確認密碼</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次輸入密碼"
                    className={`${fieldClass} pr-10`}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${t.authSubtext}`}
                    aria-label={showConfirmPassword ? "隱藏確認密碼" : "顯示確認密碼"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-[11px] mt-1 ${passwordMatched ? "text-green-400" : "text-red-400"}`}>
                    {passwordMatched ? "密碼一致" : "密碼不一致"}
                  </p>
                )}
              </div>
            )}
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

          {isLogin && (
            <p className={`text-center text-xs ${t.authSubtext}`}>
              忘記密碼？
              <button type="button" onClick={handleForgotPassword} disabled={loading} className={`${t.authLink} ml-1 underline-offset-2 hover:underline disabled:opacity-60`}>{loading ? "寄送中..." : "寄送重設信"}</button>
            </p>
          )}

          {!recoveryMode && (<p className={`text-center text-xs ${t.authSubtext}`}>
            {isLogin ? "還沒有帳號？" : "已有帳號？"}
            <button onClick={() => { setIsLogin(!isLogin); setConfirmPassword(""); setShowConfirmPassword(false); setShowPassword(false); }} className={`${t.authLink} ml-1 underline-offset-2 hover:underline`}>
              {isLogin ? "立即註冊" : "返回登入"}
            </button>
          </p>)}
        </div>

        {/* Add to Home Screen */}
        {!isStandalone && (
          <div className="text-center">
            {deferredPrompt ? (
              <button
                onClick={async () => {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === 'accepted') {
                    toast.success("已加入桌面捷徑！");
                  }
                  setDeferredPrompt(null);
                }}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg backdrop-blur-sm transition-colors ${t.authLink} border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10`}
              >
                <Download className="h-3.5 w-3.5" />
                在桌面建立捷徑
              </button>
            ) : isIos ? (
              <div>
                <button
                  onClick={() => setShowIosGuide(!showIosGuide)}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg backdrop-blur-sm transition-colors ${t.authLink} border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10`}
                >
                  <Download className="h-3.5 w-3.5" />
                  在桌面建立捷徑
                </button>
                {showIosGuide && (
                  <div className={`mt-2 text-xs rounded-lg border backdrop-blur-md p-3 space-y-1 ${t.authCard}`}>
                    <p className={t.authCardText}>iPhone / iPad 操作步驟：</p>
                    <p className={t.authSubtext}>1. 點擊 Safari 底部的 <strong>分享按鈕</strong>（方框加箭頭 ↑）</p>
                    <p className={t.authSubtext}>2. 向下滑動選擇 <strong>「加入主畫面」</strong></p>
                    <p className={t.authSubtext}>3. 點擊右上角 <strong>「新增」</strong> 即可</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
