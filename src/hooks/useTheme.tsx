import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface AppTheme {
  name: string;
  emoji: string;
  // Main app colors
  headerBg: string;
  headerBorder: string;
  titleColor: string;
  titleGlow: string;
  sidebarBg: string;
  textColor: string;
  mainBg: string;
  cardBg: string;
  cardBorder: string;
  cardHover: string;
  selectedCard: string;
  selectedBorder: string;
  selectedGlow: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentHover: string;
  mutedText: string;
  btnPrimary: { color: string; border: string; bg: string; hoverBg: string; shadow: string };
  btnSecondary: { color: string; border: string; bg: string; hoverBg: string; shadow: string };
  btnOutline: string;
  inputBorder: string;
  inputBg: string;
  inputFocus: string;
  badgeBg: string;
  // Auth page specific
  authCard: string;
  authCardText: string;
  authLabel: string;
  authInput: string;
  authLink: string;
  authSubtext: string;
  authOverlay: string;
  switcherActive: string;
}

export const themes: AppTheme[] = [
  {
    name: "🌸 少女活潑", emoji: "🌸",
    headerBg: "bg-pink-50/90 backdrop-blur-md",
    headerBorder: "border-pink-200/50",
    titleColor: "#e879a0",
    titleGlow: "rgba(232,121,160,0.4)",
    sidebarBg: "bg-pink-50/60 backdrop-blur-md",
    mainBg: "bg-pink-50/20",
    cardBg: "bg-white/70 backdrop-blur-sm",
    cardBorder: "border-pink-200/40",
    cardHover: "hover:bg-pink-50/80",
    selectedCard: "bg-pink-100/70",
    selectedBorder: "border-pink-400/50",
    selectedGlow: "shadow-[0_0_12px_-3px_rgba(236,72,153,0.25)]",
    accent: "text-pink-950",
    accentBg: "bg-pink-500/15",
    accentBorder: "border-pink-500/40",
    accentHover: "hover:bg-pink-500/25",
    mutedText: "text-pink-950/70",
    btnPrimary: { color: "hsl(330 70% 55%)", border: "hsl(330 70% 55% / 0.5)", bg: "hsl(330 70% 55% / 0.1)", hoverBg: "hsl(330 70% 55% / 0.2)", shadow: "hsl(330 70% 55% / 0.25)" },
    btnSecondary: { color: "hsl(280 60% 60%)", border: "hsl(280 60% 60% / 0.4)", bg: "hsl(280 60% 60% / 0.08)", hoverBg: "hsl(280 60% 60% / 0.18)", shadow: "hsl(280 60% 60% / 0.2)" },
    btnOutline: "border-pink-300/50 text-pink-700 hover:bg-pink-100/60",
    inputBorder: "border-pink-200/50",
    inputBg: "bg-white/60",
    inputFocus: "focus:ring-pink-400/40",
    badgeBg: "bg-pink-100/60",
    authCard: "border-pink-300/30 bg-white/60",
    authCardText: "text-pink-900",
    authLabel: "text-pink-700/70",
    authInput: "border-pink-200/60 bg-white/50 text-pink-900 placeholder:text-pink-400 focus:ring-pink-400/50",
    authLink: "text-pink-500 hover:text-pink-600",
    authSubtext: "text-pink-800/60",
    authOverlay: "from-pink-500/20 via-transparent to-purple-400/10",
    switcherActive: "bg-pink-400/30 ring-pink-400/50",
  },
  {
    name: "⚡ 青年勇猛", emoji: "⚡",
    headerBg: "bg-slate-900/95 backdrop-blur-md",
    headerBorder: "border-blue-500/20",
    titleColor: "#60a5fa",
    titleGlow: "rgba(96,165,250,0.4)",
    sidebarBg: "bg-slate-900/80 backdrop-blur-md",
    mainBg: "bg-slate-900/40",
    cardBg: "bg-slate-800/60 backdrop-blur-sm",
    cardBorder: "border-blue-500/15",
    cardHover: "hover:bg-slate-700/50",
    selectedCard: "bg-blue-900/40",
    selectedBorder: "border-blue-400/40",
    selectedGlow: "shadow-[0_0_12px_-3px_rgba(96,165,250,0.3)]",
    accent: "text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/25",
    accentHover: "hover:bg-blue-500/20",
    mutedText: "text-blue-300/50",
    btnPrimary: { color: "hsl(210 90% 65%)", border: "hsl(210 90% 60% / 0.5)", bg: "hsl(210 90% 60% / 0.12)", hoverBg: "hsl(210 90% 60% / 0.25)", shadow: "hsl(210 90% 60% / 0.3)" },
    btnSecondary: { color: "hsl(25 90% 60%)", border: "hsl(25 90% 55% / 0.4)", bg: "hsl(25 90% 55% / 0.1)", hoverBg: "hsl(25 90% 55% / 0.2)", shadow: "hsl(25 90% 55% / 0.25)" },
    btnOutline: "border-blue-500/30 text-blue-300 hover:bg-blue-900/40",
    inputBorder: "border-blue-500/25",
    inputBg: "bg-slate-800/50",
    inputFocus: "focus:ring-blue-400/40",
    badgeBg: "bg-blue-900/40",
    authCard: "border-blue-400/30 bg-slate-900/70",
    authCardText: "text-blue-50",
    authLabel: "text-blue-300/70",
    authInput: "border-blue-500/40 bg-slate-800/60 text-blue-50 placeholder:text-blue-400/50 focus:ring-blue-400/50",
    authLink: "text-blue-400 hover:text-blue-300",
    authSubtext: "text-blue-200/60",
    authOverlay: "from-blue-900/40 via-transparent to-orange-600/10",
    switcherActive: "bg-blue-500/30 ring-blue-400/50",
  },
  {
    name: "👑 中年旺盛", emoji: "👑",
    headerBg: "bg-stone-950/95 backdrop-blur-md",
    headerBorder: "border-amber-600/20",
    titleColor: "#fbbf24",
    titleGlow: "rgba(251,191,36,0.5)",
    sidebarBg: "bg-stone-950/80 backdrop-blur-md",
    mainBg: "bg-stone-900/40",
    cardBg: "bg-stone-800/60 backdrop-blur-sm",
    cardBorder: "border-amber-600/15",
    cardHover: "hover:bg-stone-700/50",
    selectedCard: "bg-amber-900/30",
    selectedBorder: "border-amber-500/40",
    selectedGlow: "shadow-[0_0_12px_-3px_rgba(251,191,36,0.25)]",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/25",
    accentHover: "hover:bg-amber-500/20",
    mutedText: "text-amber-300/50",
    btnPrimary: { color: "hsl(40 95% 64%)", border: "hsl(40 95% 55% / 0.5)", bg: "hsl(40 95% 55% / 0.1)", hoverBg: "hsl(40 95% 55% / 0.22)", shadow: "hsl(40 95% 55% / 0.3)" },
    btnSecondary: { color: "hsl(150 50% 50%)", border: "hsl(150 50% 45% / 0.4)", bg: "hsl(150 50% 45% / 0.08)", hoverBg: "hsl(150 50% 45% / 0.18)", shadow: "hsl(150 50% 45% / 0.2)" },
    btnOutline: "border-amber-600/30 text-amber-300 hover:bg-amber-900/30",
    inputBorder: "border-amber-600/25",
    inputBg: "bg-stone-800/50",
    inputFocus: "focus:ring-amber-500/40",
    badgeBg: "bg-amber-900/30",
    authCard: "border-amber-500/30 bg-stone-950/75",
    authCardText: "text-amber-50",
    authLabel: "text-amber-300/70",
    authInput: "border-amber-600/40 bg-stone-900/60 text-amber-50 placeholder:text-amber-500/40 focus:ring-amber-500/50",
    authLink: "text-amber-400 hover:text-amber-300",
    authSubtext: "text-amber-200/60",
    authOverlay: "from-amber-900/30 via-transparent to-emerald-900/10",
    switcherActive: "bg-amber-500/30 ring-amber-400/50",
  },
  {
    name: "🌌 老年智慧", emoji: "🌌",
    headerBg: "bg-indigo-950/95 backdrop-blur-md",
    headerBorder: "border-indigo-400/15",
    titleColor: "#a5b4fc",
    titleGlow: "rgba(165,180,252,0.4)",
    sidebarBg: "bg-indigo-950/80 backdrop-blur-md",
    mainBg: "bg-indigo-950/40",
    cardBg: "bg-indigo-900/40 backdrop-blur-sm",
    cardBorder: "border-indigo-400/15",
    cardHover: "hover:bg-indigo-800/40",
    selectedCard: "bg-indigo-800/40",
    selectedBorder: "border-indigo-400/40",
    selectedGlow: "shadow-[0_0_12px_-3px_rgba(165,180,252,0.25)]",
    accent: "text-indigo-300",
    accentBg: "bg-indigo-500/10",
    accentBorder: "border-indigo-400/25",
    accentHover: "hover:bg-indigo-500/15",
    mutedText: "text-indigo-300/50",
    btnPrimary: { color: "hsl(260 60% 72%)", border: "hsl(260 60% 65% / 0.4)", bg: "hsl(260 60% 65% / 0.1)", hoverBg: "hsl(260 60% 65% / 0.22)", shadow: "hsl(260 60% 65% / 0.25)" },
    btnSecondary: { color: "hsl(175 50% 55%)", border: "hsl(175 50% 50% / 0.35)", bg: "hsl(175 50% 50% / 0.08)", hoverBg: "hsl(175 50% 50% / 0.18)", shadow: "hsl(175 50% 50% / 0.2)" },
    btnOutline: "border-indigo-400/25 text-indigo-300 hover:bg-indigo-800/30",
    inputBorder: "border-indigo-400/25",
    inputBg: "bg-indigo-900/30",
    inputFocus: "focus:ring-indigo-400/40",
    badgeBg: "bg-indigo-800/40",
    authCard: "border-indigo-400/25 bg-indigo-950/70",
    authCardText: "text-indigo-100",
    authLabel: "text-indigo-300/70",
    authInput: "border-indigo-400/30 bg-indigo-900/40 text-indigo-100 placeholder:text-indigo-400/40 focus:ring-indigo-400/50",
    authLink: "text-indigo-300 hover:text-indigo-200",
    authSubtext: "text-indigo-200/60",
    authOverlay: "from-indigo-900/30 via-transparent to-teal-800/10",
    switcherActive: "bg-indigo-400/30 ring-indigo-400/50",
  },
];

interface ThemeContextType {
  themeIndex: number;
  theme: AppTheme;
  setThemeIndex: (i: number) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeIndex: 2,
  theme: themes[2],
  setThemeIndex: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeIndex, setThemeIndex] = useState(() => {
    const saved = localStorage.getItem("rich-theme");
    return saved ? parseInt(saved, 10) : 2;
  });

  useEffect(() => {
    localStorage.setItem("rich-theme", String(themeIndex));
  }, [themeIndex]);

  return (
    <ThemeContext.Provider value={{ themeIndex, theme: themes[themeIndex], setThemeIndex }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { themeIndex, setThemeIndex } = useTheme();
  return (
    <div className={`flex gap-1 rounded-xl border border-white/10 bg-black/20 backdrop-blur-md px-1.5 py-1 ${className}`}>
      {themes.map((t, i) => (
        <button
          key={t.name}
          onClick={() => setThemeIndex(i)}
          title={t.name}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all duration-200 ${
            i === themeIndex ? `${t.switcherActive} ring-1 scale-110` : "hover:bg-white/10"
          }`}
        >
          {t.emoji}
        </button>
      ))}
    </div>
  );
}
