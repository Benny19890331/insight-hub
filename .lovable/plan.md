## 目標
改成 iPhone 風格：平時欄位只顯示「1990-01-01」這種簡單文字，點一下才從下方彈出年/月/日三欄滾輪（像截圖的計時器），選好按「完成」收起，欄位就只剩數字。

## 變更

### `src/components/BirthdayInput.tsx`（改寫）
- 平時呈現：一個可點擊的輸入框，顯示 `value`（例如 `1990-01-01`），未填顯示淺色「點此選擇生日」。右側保留小 ✕ 清除鈕（有值時才出現）。
- 點擊欄位 → 用 shadcn `Drawer`（手機從底部滑出，桌機亦相容）彈出滾輪面板：
  - 標題列：左「取消」、中「選擇生日」、右「完成」（綠色）。
  - 內容：三欄並排 `ScrollPicker`（年 1925~今年、月 01~12、日依年月動態，含閏年 clamp）。
  - 滾輪用「暫存 state」操作，按「完成」才 `onChange` 寫回，按「取消」或關閉則丟棄。
  - 首次開啟若 `value` 為空 → 預設 1990/01/01；有值則帶入。
- 移除目前直接外露的三欄滾輪、外層 padding 容器、「年/月/日」標籤與外層清除按鈕（改放在欄位右側）。

### `src/components/ScrollPicker.tsx`
- 不動邏輯。Drawer 內寬度比之前充足，視覺更接近 iPhone。

## 不變動
- 對外介面 `{ value, onChange, className, inputClassName }` 不變；`AddContactDialog`、`EditContactDialog` 不需修改。
- 資料格式仍為 `YYYY-MM-DD`。
- 生日提醒、橫幅、ICS、CSV、schema 全部不動。
