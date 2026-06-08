
# 階段 1 調整方案（依回饋簡化）

## 變更

### 1. 排序固定為「最近互動置頂」（LINE 風格）
- 移除排序下拉選單與 `SortMode` 相關 state/options
- 名單依 `lastContactDate` 由新到舊自動排序，新互動的人自動浮頂

### 2. 移除壓迫感元素
- 刪除頂部「今日/逾期跟進」橘色橫幅
- 刪除每筆右側 ⚠️ 到期黃色標記

### 3. 冷度色條 + 變色天數文字合併
- 移除左側色條
- 改為「X 天未聯絡」文字本身會變色：
  - 🟢 綠色：≤ 7 天
  - 🟡 黃色：8–30 天
  - 🟠 橘色：31–60 天
  - 🔴 紅色：> 60 天
- 從未聯絡顯示為紅色「未聯絡」

## 技術摘要
`ContactList.tsx`：
- 刪除 `SortMode` type、`sortOptions`、`sortMode` state、排序 `<select>`
- 刪除 `dueToday`、頂部 banner、`overdue` 變數與標記
- `getColdness` 改回傳 `textColor`（如 `text-emerald-500`）而非背景色
- 刪除左側色條 `<span>`
- 列表 iter 仍用排序後的陣列（簡化為 inline `[...filtered].sort((a,b) => ts(b.lastContactDate) - ts(a.lastContactDate))`）
