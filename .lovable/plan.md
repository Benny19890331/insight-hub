# 修復計畫：登入卡頓、教練建議保留、頭像壓縮與調整

## 真正的元兇（已查證）
資料庫實測：`contacts.avatar_url` 是把整張原圖以 **base64** 塞進欄位，平均 **3.37 MB / 張**。雖然你只有 4 個聯絡人有頭像，但每次抓主清單都會多拖 **約 13 MB 的 JSON**——手機上光等這段就會卡住，操作也跟著慢。之前以為是 RLS/索引，現在看 payload 才是真正的瓶頸。

---

## 1. 頭像：壓縮 + 可調位置/大小 + 不再拖慢清單

### A. 客戶端壓縮（上傳時就縮）
- 在 `EditContactDialog` 的 `handleAvatarChange` 加入 **Canvas 壓縮**：
  - 最長邊縮到 512px、輸出 JPEG quality 0.82
  - 預估每張 < 80KB（從 3MB → 80KB，省 97%）
- 提供「📐 調整大小與位置」介面：
  - 圓形遮罩 + 可拖曳的圖片 + 縮放滑桿（0.8x ~ 3x）
  - 確認後輸出已裁切的最終 JPEG，存進 `avatar_url`
- 新元件：`src/components/AvatarEditor.tsx`（內含上述拖曳/縮放/裁切邏輯）

### B. 主清單不再回傳頭像（最關鍵的一刀）
- `useContacts.ts` 的 `CONTACT_COLS` **移除 `avatar_url`**
- 改成「需要的地方才抓」：
  - **聯絡人詳情頁** (`ContactDetail`)：開啟時 lazy select `avatar_url`
  - **聯絡人列表 ContactList** 的小頭像：若有 `avatarUrl` 就顯示，沒有就用首字底圖（壓縮後檔案小，後續可選擇批次拉，但首屏先不拉）
- `Contact` 型別維持 `avatarUrl?: string`；只是清單階段不再帶值

### C. 一次性遷移既有大頭像（背景處理）
- 在 `AdminDashboard` 加一顆「壓縮所有舊頭像」按鈕（只給 admin），把已存的 base64 在前端解碼→重新壓→寫回。不必動 DB schema。
- 你目前只有 4 張，按一次就清乾淨。

---

## 2. AI 教練悄悄話：只保留本機

`src/components/ReportCoachCard.tsx`：
- 新增 `localStorage` key：`report-coach-last-result`
- 元件 mount 時若有快取就直接顯示（不再每次都看到「請教練幫我看看」按鈕）
- 點「再聽一次」會覆寫快取
- 同時記下 `report-coach-last-at` 時間戳，下方顯示「上次更新於 X 分鐘前」
- 不動後端、不動資料表（符合你選的「只保留本裝置」）

---

## 3. 登入後操作卡頓

主因就是 (1) 的頭像 payload。額外再做兩件輕量收尾：
- `useContacts.ts` 把 hydration 的 `interactions` `select` 也只挑必要欄位（目前已是 `id,contact_id,user_id,date,summary`，OK）
- 確認 main 清單不依賴 `interactions` 才能渲染（目前 staged loading 已做，保留）

---

## 技術細節（給工程角度）

**壓縮工具函式** `src/lib/compressImage.ts`：
```ts
export async function compressImage(file: File, maxSize=512, quality=0.82): Promise<string> {
  const img = await loadImage(file);                  // FileReader -> Image
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width  = Math.round(img.width  * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
```

**裁切輸出**：AvatarEditor 內最終呼叫一次 `canvas.toDataURL` 輸出已經被 `transform/translate/scale` 套用後的方形/圓形區塊。

**清單瘦身對照**：
```
舊: 1 個聯絡人 row ≈ 3.4 MB（含 avatar base64）
新: 1 個聯絡人 row ≈ 2 KB（無 avatar 欄位）
```
4 張頭像情境下，主清單 payload 從 ~13 MB → ~3.6 MB（再加上後續壓縮，未來再上傳的頭像就只有 ~80KB）。

---

## 不會動到的東西
- DB schema、RLS、索引（上一輪已調過，這次無需再改）
- AI Edge Functions（GOOGLE_AI_KEY 直連維持不變）
- Auth 流程
- 任何後端 storage bucket（你選只做頭像、又只有少量資料，base64 + 壓縮已足夠，不需要另外建 bucket）

## 風險與回退
- AvatarEditor 是新元件，獨立檔案，壞了不影響其他流程
- `useContacts.ts` 的改動範圍只在「不再 select avatar_url」這一行；若有問題立刻復原
- localStorage 容量小，教練文字最多 ~1KB，無溢出風險

按「實作此計畫」我就開工。
