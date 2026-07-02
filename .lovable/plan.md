## 目標
修正 `/auth` 頁面 Google 按鈕的顯示邏輯：登入模式與註冊模式**都要**有 Google 按鈕，但文字與行為語意分開。

## 目前狀態
- 登入模式：無 Google 按鈕（只有 Email 登入 + 忘記密碼）
- 註冊模式：有「使用 Google 帳號註冊」按鈕

## 調整後
| 模式 | 顯示元素 |
|------|----------|
| 登入 | Email 登入表單、**使用 Google 帳號登入**、忘記密碼、切換到註冊 |
| 註冊 | 註冊表單（姓名/會員編號/Email/密碼）、**使用 Google 帳號註冊**、切換回登入 |

## 技術細節
修改 `src/pages/Auth.tsx`：

1. 把 Google OAuth 按鈕區塊（分隔線 + 按鈕）從「僅 `!isLogin` 時顯示」改成「兩種模式都顯示」。
2. 按鈕文字依 `isLogin` 切換：
   - `isLogin === true` → 「使用 Google 帳號登入」、錯誤訊息「Google 登入失敗」
   - `isLogin === false` → 「使用 Google 帳號註冊」、錯誤訊息「Google 註冊失敗」
3. 兩者呼叫同一個 `lovable.auth.signInWithOAuth("google", { redirect_uri: appBaseUrl })`（Google OAuth 本身不區分註冊/登入，首次是註冊、之後是登入）。
4. 忘記密碼連結維持只在登入模式顯示。
5. 「立即註冊 / 回到登入」切換連結維持在兩種模式都可見。

不動後端設定、不動其他檔案。
