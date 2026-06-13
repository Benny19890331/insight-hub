import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { loadImageFromSource } from "@/lib/compressImage";
import { ZoomIn, RotateCcw, Check, X } from "lucide-react";

/**
 * 圓形頭像裁切器：可拖曳調整位置、滑桿縮放，
 * 確認後輸出 512x512 JPEG（quality 0.82，約 60~90KB）。
 */
interface AvatarEditorProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 輸入：原始 File 或既有 dataURL */
  source: File | string | null;
  onConfirm: (dataUrl: string) => void;
}

const CANVAS_SIZE = 320; // 預覽 / 輸出比例使用
const OUTPUT_SIZE = 512;

export function AvatarEditor({ open, onOpenChange, source, onConfirm }: AvatarEditorProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 載入圖片
  useEffect(() => {
    if (!open || !source) return;
    let cancelled = false;
    loadImageFromSource(source).then((image) => {
      if (cancelled) return;
      setImg(image);
      // 初始填滿圓
      const fit = CANVAS_SIZE / Math.min(image.width, image.height);
      setScale(fit);
      setOffset({ x: 0, y: 0 });
    });
    return () => {
      cancelled = true;
    };
  }, [open, source]);

  // 繪製預覽
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.save();
    // 圓形遮罩
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

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };
  const onPointerUp = () => {
    setDragging(false);
    dragStart.current = null;
  };

  const reset = () => {
    if (!img) return;
    const fit = CANVAS_SIZE / Math.min(img.width, img.height);
    setScale(fit);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    if (!img) return;
    // 以 OUTPUT_SIZE 重畫一份高解析度版本，套用同樣比例
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
          <DialogDescription>拖曳移動位置、用滑桿縮放，確認後會自動壓縮上傳</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pt-2">
          <div
            className="relative rounded-full border-2 border-primary/40 overflow-hidden touch-none cursor-grab active:cursor-grabbing"
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, maxWidth: "100%" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />
          </div>

          <div className="w-full flex items-center gap-3 px-2">
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <Slider
              min={0.2}
              max={4}
              step={0.01}
              value={[scale]}
              onValueChange={(v) => setScale(v[0])}
              className="flex-1"
            />
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
