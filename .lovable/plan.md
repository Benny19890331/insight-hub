## 修正範圍

### 1. 手機切換 App 後資料不消失（草稿自動保存）

**`src/components/AddContactDialog.tsx`**
- 新增 `DRAFT_KEY = "addContactDraft:v1"` 常數。
- `useEffect` #1：當 dialog 開啟、且任一欄位變動時，把整個表單 state 序列化成 JSON 存進 `localStorage`（用 `setTimeout` 300ms 去抖，避免每次按鍵都寫入）。
- `useEffect` #2：當 dialog 由關閉變開啟、且當下 state 全空時，讀取 `localStorage` 草稿；若有內容，使用 `window.confirm("發現上次未完成的新增聯絡人草稿，要繼續編輯嗎？")` 詢問。確認 → 還原所有欄位；取消 → 清掉草稿。
- `handleSave()` 與 `reset()`（被「取消離開」呼叫時）都清掉 `localStorage` 草稿。
- `EditContactDialog` 不動（編輯既有資料、來源已在資料庫，不需草稿）。

行為總結：你打到一半切去看別人資料 → 回到本頁面（即使整頁被 iOS 釋放重新載入）→ 再開啟「新增聯絡人」→ 跳出「要不要繼續上次的草稿？」。

### 2. 長錄音改善

**`supabase/functions/voice-transcribe/index.ts`**
- 模型從 `gemini-3.5-flash` 換成 `gemini-2.5-pro`（同金鑰可用，多模態音訊辨識能力遠優於 flash，尤其對台語、慢語速、長停頓）。
- Prompt 強化：明確要求 **「若聽到台語請翻成自然繁體中文書寫，保留人名/產品名原音；遇停頓請耐心等待整段；輸出只給聽寫文字。」**
- 其餘 CORS、回傳格式不變。

**`src/components/VoiceInputButton.tsx`**
- 狀態列 `<span>` 加 `whitespace-nowrap`，並把外層 wrapper 改成 `overflow-x-auto`，避免「🎵 長錄音（會聽台語）」被斷行切開。在窄螢幕會變成可橫向滑動的單行；在桌機正常顯示。

## 不會動到的東西
- BirthdayInput 滾輪、AvatarEditor、其他 dialog、Auth、資料庫 schema 全部不變。
- VoiceInputButton 的錄音/即時聽寫流程不變，只改視覺與後端模型。

## 技術細節
- localStorage key 帶版本號 `:v1`，未來欄位若大幅調整可直接升版避免舊草稿造成型別錯誤。
- 草稿 JSON 體積極小（純文字欄位），無壓力。
- Gemini 2.5 Pro 在 Lovable Cloud 已可用同一把 `GEMINI_API_KEY`，呼叫端點只需把 URL 中模型名替換即可，前端不需改動。
