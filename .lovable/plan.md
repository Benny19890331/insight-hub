## 目標
把生日選擇從現在的「原生日期欄（手機顯示為系統選擇器）」改成直接顯示「年、月、日」三個並排滾輪，所見即所得，老年人友善。

## 變更內容

### 1. 改寫 `src/components/BirthdayInput.tsx`
- 移除原本的 `<input type="date">` 與系統選擇器。
- 直接在欄位位置顯示三個並排 `ScrollPicker`：
  - 年：1925 ~ 今年（由新到舊或由舊到新，預設由舊到新）
  - 月：01 ~ 12
  - 日：依「選中年月」動態計算當月天數（自動處理閏年；若使用者已選 31 日後切到 2 月會自動 clamp 到該月最後一天）
- 三欄底下保留現有清除鈕（小 ✕），點下時把值清成空字串。
- 沒值時預設顯示：年＝1990、月＝01、日＝01，但 `value` 仍維持空字串直到使用者「滾動其中任一欄」才寫回 `onChange`（避免一打開頁面就誤填生日）。
- 維持原本對外介面 `{ value, onChange, className, inputClassName }`，`inputClassName` 改為套用到三欄外層容器，呼叫端（`AddContactDialog`、`EditContactDialog`）不需要改。

### 2. `src/components/ScrollPicker.tsx`
- 不動邏輯，僅視需要支援較窄寬度（三欄並排時每欄寬度受限）。

## 技術細節
- 當月天數：`new Date(year, month, 0).getDate()`。
- 內部以三個 state（y/m/d 字串）同步 `value` ISO；任一改動就組成 `YYYY-MM-DD` 呼叫 `onChange`。
- 外部 `value` 變化時（例如清除或從 DB 載入）也要同步回三欄 state。
- 高度沿用 ScrollPicker 預設 108px（顯示 3 列），與目前欄位框相近，不破壞 dialog 版面。

## 不變動
- 生日提醒下拉、生日橫幅、ICS 匯出、CSV 匯入解析、Supabase schema 全部不動。
