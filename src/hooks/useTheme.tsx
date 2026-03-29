import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface AppTheme {
  name: string;
  emoji: string;
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
    headerBg: "bg-pink-50/70 backdrop-blur-xl",
    headerBorder: "border-pink-200/50",
    titleColor: "#e879a0",
    titleGlow: "rgba(232,121,160,0.4)",
    textColor: "text-gray-900",
    sidebarBg: "bg-pink-50/70 backdrop-blur-xl",
    mainBg: "bg-pink-50/60 backdrop-blur-lg",
    cardBg: "bg-white/50 backdrop-blur-md",
    cardBorder: "border-pink-200/40",
    cardHover: "hover:bg-pink-100/80",
    selectedCard: "bg-pink-100/70",
    selectedBorder: "border-pink-400/50",
    selectedGlow: "shadow-[0_0_12px_-3px_rgba(236,72,153,0.25)]",
    accent: "text-pink-800",
    accentBg: "bg-pink-500/15",
    accentBorder: "border-pink-500/40",
    accentHover: "hover:bg-pink-500/25",
    mutedText: "text-pink-950/80",
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
    name: "💜 紫羅蘭優雅", emoji: "💜",
    headerBg: "bg-purple-50/70 backdrop-blur-xl",
    headerBorder: "border-purple-200/50",
    titleColor: "#a855f7",
    titleGlow: "rgba(168,85,247,0.4)",
    textColor: "text-gray-950",
    sidebarBg: "bg-purple-50/70 backdrop-blur-xl",
    mainBg: "bg-purple-50/60 backdrop-blur-lg",
    cardBg: "bg-white/50 backdrop-blur-md",
    cardBorder: "border-purple-200/40",
    cardHover: "hover:bg-purple-100/80",
    selectedCard: "bg-purple-100/70",
    selectedBorder: "border-purple-400/50",
    selectedGlow: "shadow-[0_0_12px_-3px_rgba(168,85,247,0.25)]",
    accent: "text-gray-900",
    accentBg: "bg-purple-500/15",
    accentBorder: "border-purple-500/40",
    accentHover: "hover:bg-purple-500/25",
    mutedText: "text-gray-800",
    btnPrimary: { color: "hsl(270 70% 50%)", border: "hsl(270 70% 45% / 0.55)", bg: "hsl(270 70% 50% / 0.12)", hoverBg: "hsl(270 70% 50% / 0.24)", shadow: "hsl(270 70% 50% / 0.28)" },
    btnSecondary: { color: "hsl(330 60% 45%)", border: "hsl(330 60% 45% / 0.45)", bg: "hsl(330 60% 45% / 0.08)", hoverBg: "hsl(330 60% 45% / 0.18)", shadow: "hsl(330 60% 45% / 0.2)" },
    btnOutline: "border-purple-300/60 text-gray-900 hover:bg-purple-100/70",
    inputBorder: "border-purple-300/60",
    inputBg: "bg-white/70",
    inputFocus: "focus:ring-purple-500/45",
    badgeBg: "bg-purple-100/60",
    authCard: "border-purple-300/35 bg-white/70",
    authCardText: "text-gray-950",
    authLabel: "text-gray-800",
    authInput: "border-purple-300/70 bg-white/65 text-gray-950 placeholder:text-gray-500 focus:ring-purple-500/55",
    authLink: "text-purple-800 hover:text-purple-900",
    authSubtext: "text-gray-700",
    authOverlay: "from-purple-500/20 via-transparent to-indigo-400/10",
    switcherActive: "bg-purple-400/30 ring-purple-400/50",
  },
  {
    name: "⚡ 青年勇猛", emoji: "⚡",
    headerBg: "bg-slate-900/70 backdrop-blur-xl",
    headerBorder: "border-blue-500/20",
    titleColor: "#60a5fa",
    titleGlow: "rgba(96,165,250,0.4)",
    textColor: "text-blue-50",
    sidebarBg: "bg-slate-900/70 backdrop-blur-xl",
    mainBg: "bg-slate-900/60 backdrop-blur-lg",
    cardBg: "bg-slate-800/50 backdrop-blur-md",
    cardBorder: "border-blue-500/15",
    cardHover: "hover:bg-slate-700/80",
    selectedCard: "bg-blue-900/40",
    selectedBorder: "border-blue-400/40",
    selectedGlow: "shadow-[0_0_12px_-3px_rgba(96,165,250,0.3)]",
    accent: "text-blue-300",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/25",
    accentHover: "hover:bg-blue-500/20",
    mutedText: "text-blue-200/70",
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
    headerBg: "bg-stone-950/70 backdrop-blur-xl",
    headerBorder: "border-amber-600/20",
    titleColor: "#fbbf24",
    titleGlow: "rgba(251,191,36,0.5)",
    textColor: "text-amber-50",
    sidebarBg: "bg-stone-950/70 backdrop-blur-xl",
    mainBg: "bg-stone-900/60 backdrop-blur-lg",
    cardBg: "bg-stone-800/50 backdrop-blur-md",
    cardBorder: "border-amber-600/15",
    cardHover: "hover:bg-stone-700/80",
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
    headerBg: "bg-indigo-950/70 backdrop-blur-xl",
    headerBorder: "border-indigo-400/15",
    titleColor: "#a5b4fc",
    titleGlow: "rgba(165,180,252,0.4)",
    textColor: "text-indigo-50",
    sidebarBg: "bg-indigo-950/70 backdrop-blur-xl",
    mainBg: "bg-indigo-950/60 backdrop-blur-lg",
    cardBg: "bg-indigo-900/50 backdrop-blur-md",
    cardBorder: "border-indigo-400/15",
    cardHover: "hover:bg-indigo-800/80",
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

const FONT_SIZES = [
  { label: "標準", cls: "font-scale-base" },
  { label: "大", cls: "font-scale-lg" },
  { label: "特大", cls: "font-scale-xl" },
];

interface ThemeContextType {
  themeIndex: number;
  theme: AppTheme;
  setThemeIndex: (i: number) => void;
  fontSizeIndex: number;
  setFontSizeIndex: (i: number) => void;
  fontSizeClass: string;
}

const ThemeContext = createContext<ThemeContextType>({
  themeIndex: 3,
  theme: themes[3],
  setThemeIndex: () => {},
  fontSizeIndex: 0,
  setFontSizeIndex: () => {},
  fontSizeClass: "font-scale-base",
});

// Light themes (pink, violet) need special CSS variable overrides
const LIGHT_THEME_INDICES = [0, 1];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeIndex, setThemeIndex] = useState(() => {
    const saved = localStorage.getItem("rich-theme");
    return saved ? parseInt(saved, 10) : 3;
  });
  const [fontSizeIndex, setFontSizeIndex] = useState(() => {
    const saved = localStorage.getItem("rich-font-size");
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem("rich-theme", String(themeIndex));
    const root = document.documentElement;
    const isLight = LIGHT_THEME_INDICES.includes(themeIndex);

    if (isLight) {
      root.setAttribute("data-theme", themeIndex === 0 ? "pink" : "violet");

      if (themeIndex === 0) {
        root.style.setProperty("--foreground", "330 30% 15%");
        root.style.setProperty("--card-foreground", "330 30% 15%");
        root.style.setProperty("--popover-foreground", "330 30% 15%");
        root.style.setProperty("--muted-foreground", "330 15% 40%");
        root.style.setProperty("--accent-foreground", "330 40% 25%");
        root.style.setProperty("--secondary-foreground", "330 15% 35%");
        root.style.setProperty("--background", "330 50% 96%");
        root.style.setProperty("--popover", "330 60% 92%");
        root.style.setProperty("--accent", "330 50% 85%");
        root.style.setProperty("--card", "330 50% 95%");
        root.style.setProperty("--muted", "330 40% 90%");
        root.style.setProperty("--border", "330 30% 80%");
      } else {
        root.style.setProperty("--foreground", "0 0% 15%");
        root.style.setProperty("--card-foreground", "0 0% 15%");
        root.style.setProperty("--popover-foreground", "0 0% 15%");
        root.style.setProperty("--muted-foreground", "0 0% 40%");
        root.style.setProperty("--accent-foreground", "0 0% 25%");
        root.style.setProperty("--secondary-foreground", "0 0% 35%");
        root.style.setProperty("--background", "270 40% 96%");
        root.style.setProperty("--popover", "270 50% 92%");
        root.style.setProperty("--accent", "270 40% 88%");
        root.style.setProperty("--card", "270 40% 95%");
        root.style.setProperty("--muted", "270 30% 90%");
        root.style.setProperty("--border", "270 25% 80%");
      }
    } else {
      root.removeAttribute("data-theme");
      root.style.setProperty("--foreground", "210 20% 92%");
      root.style.setProperty("--card-foreground", "210 20% 92%");
      root.style.setProperty("--popover", "220 18% 10%");
      root.style.setProperty("--popover-foreground", "210 20% 92%");
      root.style.setProperty("--muted-foreground", "215 15% 65%");
      root.style.setProperty("--accent", "215 20% 17%");
      root.style.setProperty("--accent-foreground", "168 80% 80%");
      root.style.setProperty("--secondary-foreground", "210 20% 80%");
      root.style.setProperty("--card", "220 18% 12%");
      root.style.setProperty("--muted", "215 20% 18%");
      root.style.setProperty("--background", "220 18% 8%");
      root.style.setProperty("--border", "215 20% 20%");
    }
  }, [themeIndex]);

  useEffect(() => {
    localStorage.setItem("rich-font-size", String(fontSizeIndex));
    FONT_SIZES.forEach(f => document.documentElement.classList.remove(f.cls));
    document.documentElement.classList.add(FONT_SIZES[fontSizeIndex]?.cls ?? "font-scale-base");
  }, [fontSizeIndex]);

  return (
    <ThemeContext.Provider value={{ themeIndex, theme: themes[themeIndex], setThemeIndex, fontSizeIndex, setFontSizeIndex, fontSizeClass: FONT_SIZES[fontSizeIndex]?.cls ?? "font-scale-base" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { themeIndex, setThemeIndex } = useTheme();
  const current = themes[themeIndex];
  const handleClick = () => setThemeIndex((themeIndex + 1) % themes.length);
  return (
    <button
      onClick={handleClick}
      title="切換風格"
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all duration-200 border border-white/10 bg-black/20 backdrop-blur-md hover:bg-white/10 ${current.switcherActive} ${className}`}
    >
      {current.emoji}
    </button>
  );
}

export function FontSizeSwitcher({ className = "" }: { className?: string }) {
  const { fontSizeIndex, setFontSizeIndex } = useTheme();
  const handleClick = () => setFontSizeIndex((fontSizeIndex + 1) % FONT_SIZES.length);
  const current = FONT_SIZES[fontSizeIndex];
  return (
    <button
      onClick={handleClick}
      title={`文字大小：${current.label}`}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 border border-white/10 bg-black/20 backdrop-blur-md hover:bg-white/10 text-white/80 text-xs font-bold ${className}`}
    >
      {current.label}
    </button>
  );
}
