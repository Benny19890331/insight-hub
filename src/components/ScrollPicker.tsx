import { useRef, useEffect, useCallback } from "react";

interface ScrollPickerProps {
  items: string[];
  value: string;
  onChange: (val: string) => void;
  height?: number;
}

const ITEM_H = 36;

export function ScrollPicker({ items, value, onChange, height = 108 }: ScrollPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const visibleCount = Math.floor(height / ITEM_H);
  const padCount = Math.floor(visibleCount / 2);

  const scrollToIndex = useCallback((idx: number, smooth = false) => {
    if (ref.current) {
      ref.current.scrollTo({ top: idx * ITEM_H, behavior: smooth ? "smooth" : "auto" });
    }
  }, []);

  useEffect(() => {
    const idx = items.indexOf(value);
    if (idx >= 0 && !isScrolling.current) {
      scrollToIndex(idx);
    }
  }, [value, items, scrollToIndex]);

  const handleScroll = useCallback(() => {
    if (!ref.current) return;
    isScrolling.current = true;
    clearTimeout((ref.current as any)._scrollTimer);
    (ref.current as any)._scrollTimer = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      scrollToIndex(clamped, true);
      if (items[clamped] !== value) {
        onChange(items[clamped]);
      }
      isScrolling.current = false;
    }, 80);
  }, [items, value, onChange, scrollToIndex]);

  return (
    <div className="relative rounded-md border border-border bg-secondary overflow-hidden" style={{ height }}>
      {/* highlight bar */}
      <div
        className="absolute left-0 right-0 pointer-events-none border-y border-primary/40 bg-primary/10 z-10"
        style={{ top: padCount * ITEM_H, height: ITEM_H }}
      />
      {/* fade edges */}
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-secondary to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-secondary to-transparent z-10 pointer-events-none" />

      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-none"
        style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {/* top padding */}
        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`pt-${i}`} style={{ height: ITEM_H }} />
        ))}
        {items.map((item) => (
          <div
            key={item}
            className={`flex items-center justify-center font-mono text-sm cursor-pointer transition-colors ${
              item === value ? "text-primary font-semibold" : "text-muted-foreground"
            }`}
            style={{ height: ITEM_H, scrollSnapAlign: "start" }}
            onClick={() => {
              onChange(item);
              scrollToIndex(items.indexOf(item), true);
            }}
          >
            {item}
          </div>
        ))}
        {/* bottom padding */}
        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`pb-${i}`} style={{ height: ITEM_H }} />
        ))}
      </div>
    </div>
  );
}
