## 目標
每次「登入 app」或「打開／重新整理網頁」時，使用教學按鈕都要重新出現，並重新計算 3 分鐘倒數；3 分鐘內沒點就自動隱藏。

## 目前狀況
`src/components/TutorialButton.tsx` 把 deadline 存在 `sessionStorage`。雖然 sessionStorage 在分頁關閉後會清掉，但：
- 同一個分頁重新整理時，會沿用舊的 deadline（可能已過期）→ 按鈕直接不出現。
- 登出再登入（同一分頁、未關閉）時，也會沿用舊 deadline → 按鈕不會重新出現。

使用者要的是「每次開啟 / 每次登入都重新顯示 3 分鐘」，所以不應該跨 reload / 跨登入保留 deadline。

## 修改計畫

### 1. `src/components/TutorialButton.tsx`
- 移除 `sessionStorage` 相關邏輯（`STORAGE_KEY`、讀取 / 寫入 deadline）。
- 改為：元件 mount 時 → `setVisible(true)` 並啟動 3 分鐘 `setTimeout` → 到時 `setVisible(false)`。
- 點擊按鈕時：開啟對話框並重置 timer（清掉舊的、重新跑 3 分鐘）。
- 卸載時 clear timer。

這樣每次頁面載入（含登入後進入 `/`）都會重新開始 3 分鐘倒數。

### 2. 登入後重新顯示
`TutorialButton` 目前掛在 `src/pages/Index.tsx`（受 `ProtectedRoute` 保護）。登入流程是：使用者在 `/auth` 登入成功 → 導回 `/` → `Index` 重新 mount → `TutorialButton` 重新 mount → 自動重置 3 分鐘。
所以只要拿掉 sessionStorage，登入情境就自動 OK，不需要動 `useAuth` 或 `Index.tsx`。

### 技術細節
- 用 `useRef<ReturnType<typeof setTimeout>>` 保存 timer id。
- `HIDE_DELAY = 3 * 60 * 1000`。
- 不再需要 `useCallback` 對 deadline 做 schedule，可簡化成單一 `resetTimer()`。

## 不會改動
- 教學內容、樣式、Dialog 行為。
- 其他元件、路由、Auth 流程。
