import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { loadImageFromSource } from "@/lib/compressImage";
import { RotateCcw, Check, X, Plus, Minus } from "lucide-react";

const CANVAS_SIZE = 320;
const OUTPUT_SIZE = 512;
const MIN_SCALE = 0.2;
const MAX_SCALE = 2;
const STEP = 0.2;

interface AvatarEditorProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  source: File | string | null;
  onConfirm: (dataUrl: string) => void;
}

function getDistance(a: Touch, b: Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
function getCenter(a: Touch, b: Touch) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

export function AvatarEditor({ open, onOpenChange, source, onConfirm }: AvatarEditorProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinchStart = useRef<{ initialDistance: number; initialScale: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);
  const draggingRef = useRef(dragging);
  const isPinchingRef = useRef(isPinching);

  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { draggingRef.current = dragging; }, [dragging]);
  useEffect(() => { isPinchingRef.current = isPinching; }, [isPinching]);

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

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        dragStart.current = { x: t.clientX, y: t.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
        setDragging(true);
        e.preventDefault();
      } else if (e.touches.length >= 2) {
        setIsPinching(true);
        pinchStart.current = { initialDistance: getDistance(e.touches[0], e.touches[1]), initialScale: scaleRef.current };
        e.preventDefault();
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isPinchingRef.current && e.touches.length >= 2 && pinchStart.current) {
        const d = getDistance(e.touches[0], e.touches[1]);
        const ratio = d / pinchStart.current.initialDistance;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchStart.current.initialScale * ratio));
        setScale(newScale);
        e.preventDefault();
      } else if (draggingRef.current && dragStart.current && e.touches.length === 1) {
        const t = e.touches[0];
        setOffset({
          x: dragStart.current.ox + (t.clientX - dragStart.current.x),
          y: dragStart.current.oy + (t.clientY - dragStart.current.y),
        });
        e.preventDefault();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        setDragging(false);
        setIsPinching(false);
      } else if (e.touches.length === 1 && isPinchingRef.current) {
        setIsPinching(false);
        const t = e.touches[0];
        dragStart.current = { x: t.clientX, y: t.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
        setDragging(true);
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || !dragging || !dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    setDragging(false);
    dragStart.current = null;
  };

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
          <DialogDescription>拖曳移動位置、雙指捏合縮放，確認後會自動壓縮上傳</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pt-2">
          <div
            ref={wrapperRef}
            className="relative rounded-full border-2 border-primary/40 overflow-hidden touch-none cursor-grab active:cursor-grabbing"
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, maxWidth: "100%", touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />
          </div>

          <div className="w-full flex items-center justify-center gap-2 px-2">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(MIN_SCALE, s - STEP))}
              className="inline-flex items-center justify-center rounded-full border border-border bg-muted/50 w-8 h-8 text-sm hover:bg-muted"
              aria-label="縮小"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-sm text-muted-foreground">雙指捏合縮放</span>
            <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">{scale.toFixed(1)}x</span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(MAX_SCALE, s + STEP))}
              className="inline-flex items-center justify-center rounded-full border border-border bg-muted/50 w-8 h-8 text-sm hover:bg-muted"
              aria-label="放大"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 ml-1"
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
