// Status color mapping for visual differentiation
export const statusColorMap: Record<string, { bg: string; text: string; border: string }> = {
  "愛用者": { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  "經營者": { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30" },
  "高度興趣": { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" },
  "初步接觸": { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30" },
  "觀望中": { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  "鐵粉": { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
};

export const defaultStatusColor = { bg: "bg-muted/30", text: "text-muted-foreground", border: "border-border" };

export function getStatusColor(status: string) {
  return statusColorMap[status] ?? defaultStatusColor;
}
