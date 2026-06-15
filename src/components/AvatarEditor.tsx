import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { loadImageFromSource } from "@/lib/compressImage";
import { RotateCcw, Check, X } from "lucide-react";

const CANVAS_SIZE = 320;
const OUTPUT_SIZE = 512;
const MIN_SCALE = 0.2;
const MAX_SCALE = 2;

interface AvatarEditorProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  source: File | string | null;
  onConfirm: (dataUrl: string) => void;
}

interface PointerInfo {
  x: number;
  y: number;
}

export function AvatarEditor({ open, onOpenChange, source, onConfirm }: AvatarEditorProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Active pointers
  const pointersRef = useRef<Map<number, PointerInfo>>(new Map());
  // Gesture start snapshot
  const gestureRef = useRef<{
    mode: "drag" | "pinch" | null;
    startCenter: { x: number; y: number };
    startDistance: number;
    startScale: number;
    startOffset: { x: number; y: number };
  }>({
    mode: null,
    startCenter: { x: 0, y: 0 },
    startDistance: 0,
    startScale: 1,
    startOffset: { x: 0, y: 0 },
  });
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  useEffect(() => {
    if (!open || !source) return;
    let cancelled = false;
    loadImageFromSource(source).then((image) => {
      if (cancelled) return;
      setImg(image);
      const fit = CANVAS_SIZE / Math.min(image.width, image.height);
      setScale(Math.min(fit, MAX_SCALE));
      setOffset({ x: 0, y: 0 });
    });
    return () => {
      cancelled = true;
    };
  }, [open, source]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const w = img.width * scale;
    const h = img.height * scale;
    const x = CANVAS_SIZE / 2 - w / 2 + offset.x;
    const y = CANVAS_SIZE / 2 - h / 2 + offset.y;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }, [img, scale, offset]);

  // Pointer-based gestures (works for touch, pen, mouse)
  useEffect(() => {
    if (!open) return;
    const el = wrapperRef.current;
    if (!el) return;

    const snapshotGesture = () => {
      const pts = Array.from(pointersRef.current.values());
      if (pts.length === 1) {
        gestureRef.current = {
          mode: "drag",
          startCenter: { x: pts[0].x, y: pts[0].y },
          startDistance: 0,
          startScale: scaleRef.current,
          startOffset: { ...offsetRef.current },
        };
      } else if (pts.length >= 2) {
        const [a, b] = pts;
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        gestureRef.current = {
          mode: "pinch",
          startCenter: { x: cx, y: cy },
          startDistance: dist,
          startScale: scaleRef.current,
          startOffset: { ...offsetRef.current },
        };
      } else {
        gestureRef.current.mode = null;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId);
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      snapshotGesture();
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = Array.from(pointersRef.current.values());
      const g = gestureRef.current;
      if (g.mode === "pinch" && pts.length >= 2) {
        const [a, b] = pts;
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const ratio = dist / g.startDistance;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, g.startScale * ratio));
        setScale(newScale);
        setOffset({
          x: g.startOffset.x + (cx - g.startCenter.x),
          y: g.startOffset.y + (cy - g.startCenter.y),
        });
        e.preventDefault();
      } else if (g.mode === "drag" && pts.length === 1) {
        setOffset({
          x: g.startOffset.x + (pts[0].x - g.startCenter.x),
          y: g.startOffset.y + (pts[0].y - g.startCenter.y),
        });
        e.preventDefault();
      }
    };

    const onPointerEnd = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      el.releasePointerCapture?.(e.pointerId);
      // Re-snapshot so remaining finger continues smoothly
      snapshotGesture();
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerEnd);
    el.addEventListener("pointercancel", onPointerEnd);
    el.addEventListener("pointerleave", onPointerEnd);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerEnd);
      el.removeEventListener("pointercancel", onPointerEnd);
      el.removeEventListener("pointerleave", onPointerEnd);
      pointersRef.current.clear();
    };
  }, [open, img]);

  const reset = () => {
    if (!img) return;
    const fit = CANVAS_SIZE / Math.min(img.width, img.height);
    setScale(Math.min(fit, MAX_SCALE));
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    if (!img) return;
    const ratio = OUTPUT_SIZE / CANVAS_SIZE;
    const out = document.createElement("canvas");
    out.width = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const ctx = out.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const w = img.width * scale * ratio;
    const h = img.height * scale * ratio;
    const x = OUTPUT_SIZE / 2 - w / 2 + offset.x * ratio;
    const y = OUTPUT_SIZE / 2 - h / 2 + offset.y * ratio;
    ctx.drawImage(img, x, y, w, h);
    const dataUrl = out.toDataURL("image/jpeg", 0.82);
    onConfirm(dataUrl);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>調整頭像</DialogTitle>
          <DialogDescription className="sr-only">調整頭像位置與縮放</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pt-2">
          <div
            ref={wrapperRef}
            className="relative rounded-full border-2 border-primary/40 overflow-hidden cursor-grab active:cursor-grabbing select-none"
            style={{
              width: CANVAS_SIZE,
              height: CANVAS_SIZE,
              maxWidth: "100%",
              touchAction: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
              overscrollBehavior: "contain",
            }}
          >
            <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} style={{ touchAction: "none", pointerEvents: "none" }} />
          </div>

          <div className="w-full flex items-center justify-center px-2">
            <button
              type="button"
              onClick={reset}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" /> 重設
            </button>
          </div>

          <div className="flex gap-3 w-full pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/50 py-2.5 text-sm font-medium hover:bg-muted"
            >
              <X className="h-4 w-4" /> 取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!img}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> 確認套用
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
