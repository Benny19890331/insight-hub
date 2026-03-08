import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  heat: "cold" | "warm" | "hot" | "loyal";
  label: string;
  className?: string;
}

const heatStyles: Record<string, string> = {
  cold: "bg-badge-cool/15 text-badge-cool border-badge-cool/30",
  warm: "bg-badge-warm/15 text-badge-warm border-badge-warm/30",
  hot: "bg-badge-hot/15 text-badge-hot border-badge-hot/30",
  loyal: "bg-badge-success/15 text-badge-success border-badge-success/30",
};

export function StatusBadge({ heat, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        heatStyles[heat],
        className
      )}
    >
      {label}
    </span>
  );
}
