/**
 * 將 File 或 dataURL 縮圖壓縮後輸出 JPEG dataURL
 * - 最長邊縮到 maxSize（預設 512px）
 * - JPEG quality 預設 0.82
 * 一張 3MB 的相機原圖 → 約 60~90KB
 */
export async function loadImageFromSource(src: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    if (typeof src === "string") {
      img.src = src;
    } else {
      const reader = new FileReader();
      reader.onload = () => (img.src = reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(src);
    }
  });
}

export async function compressImage(
  source: File | string,
  maxSize = 512,
  quality = 0.82
): Promise<string> {
  const img = await loadImageFromSource(source);
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
