## 問題診斷

資料庫端檢查結果：你的帳號（d61026106@yahoo.com.tw）**互動紀錄 74 筆全部還在**，完全沒有遺失。問題出在前端的載入流程。

`src/hooks/useContacts.ts` 的 `fetchContacts` 流程：

1. 第一階段先抓 contacts，**先用空 Map 建立 contacts**（所以 `interactions: []`）
2. 第二階段背景抓 interactions 再合併進去
3. 但用了一個 `hydratedUserIdRef` 旗標：若已 hydrate 過該使用者，**第二階段直接跳過**

當登入 token 自動刷新、或任何原因觸發 `fetchContacts` 第二次執行時：
- 第 192 行把所有 contacts 重置為「沒有 interactions」的版本
- 第 201 行的 `if (hydratedUserIdRef.current === user.id) return` 阻止了 hydration 重跑
- 結果：畫面上所有人的互動紀錄瞬間全部消失（但 DB 沒事）

從 auth log 也看到你今天 10:44 剛經歷一次 token_revoked + 重新登入，剛好觸發這個 bug。

## 修正方案

只改 `src/hooks/useContacts.ts` 一個檔案：

1. **保留既有互動資料**：當 `fetchContacts` 重跑時，於第 192 行把舊的 `interactions` / `insightTags` 依 contact id 合併進新 contacts，這樣即使 hydration 被跳過，畫面也不會清空。

2. **移除錯誤的 hydration 守門**：把 `hydratedUserIdRef.current === user.id` 這個跳過條件拿掉（保留 `hydrationPromiseRef` 防止並發重複），讓每次重新登入或重新抓取時，互動與 insights 一定會重新同步。仍維持分頁、平行抓取，效能不受影響。

3. **保險**：hydration 失敗時不覆寫 contacts 的 interactions（目前已是這樣，保留）。

修完後重新整理、token 刷新、切回前景都不會再出現「歷史互動全部不見」的狀況。
