## 審查結論：GPT 這份「大量名單安全合併」改動整體邏輯正確、可以採用

### 核心設計摘要
GPT 把原本在瀏覽器端做的重複名單合併，改成：

1. **後端 RPC 交易式合併**（新 migration `20260712010000_contact_merge_jobs.sql`）
   - 新增 `public.contact_merge_jobs` 表（含 RLS、只允許 authenticated SELECT，寫入只走 SECURITY DEFINER 函式）
   - 新增 `contact_ops` schema，內含會員編號/姓名的正規化函式 + `contacts` 表的表達式索引，讓上萬筆也能快速找重複
   - `create_contact_merge_job()`：建立工作 + advisory lock，避免兩個分頁同時合併
   - `run_contact_merge_job(job_id)`：整個合併在一個 DB 交易內完成，失敗自動 rollback、原資料不會壞
   - 授權：GRANT EXECUTE 給 authenticated，符合我們規範
2. **前端分頁工具 `fetchAllPages`**：解掉 Supabase 預設 1000 筆截斷，`useContacts.ts` 全面改用它抓 contacts/interactions/insights
3. **`contactDedup.ts` / `contactMergeJob.ts`**：可測試的純函式 + RPC 結果解析（含測試檔）
4. **`useContacts.deduplicateContacts`**：優先呼叫 DB RPC；RPC 尚未部署時退回瀏覽器版；連線中斷會回讀 job 狀態，避免謊報失敗

### 可以放心的點
- RLS + GRANT 都齊全，沒有繞過權限的破口
- 交易式合併確保「合併失敗 → 原始名單一定還在」，符合「安全合併」的訴求
- 分頁抓取符合我們既有的核心規則（>1000 筆用分頁）
- 提供 fallback + 錯誤復原，不會因為部署順序或網路中斷把資料弄髒

### 需要注意 / 我建議跟你確認的三件事
1. **statement_timeout = 120s**：`run_contact_merge_job` 上限 2 分鐘。上萬筆重複時可能不夠，但因為交易式，逾時只會 rollback 不會壞資料 → 需要時再放寬即可。是否要我把它調到 5 分鐘？
2. **導入範圍**：這個 zip 是「整包專案」，包含 GPT 順手改到的其他檔案（例如 `CsvImportDialog.tsx` 有 465 行、可能夾雜非合併相關改動）。建議只導入合併相關檔案，避免覆蓋你近期的其他修改：
   - `supabase/migrations/20260712010000_contact_merge_jobs.sql`（新增）
   - `src/lib/fetchAllPages.ts`、`src/lib/contactDedup.ts`、`src/lib/contactMergeJob.ts`（新增）
   - `src/hooks/useContacts.ts`（合併相關段落）
   - `src/integrations/supabase/types.ts`（RPC 型別自動重生，實際上要用 supabase 工具重跑）
   - 對應的三個 test 檔
   - `CsvImportDialog.tsx` 若只是為了顯示合併進度可以一併帶，需要我逐段比對後再決定
3. **相依函式**：migration 用到既有的 `public.touch_contacts_updated_at()`，這在你目前專案已存在，OK。

### 建議下一步（等你點頭我再進 build）
- 確認採用「只導入合併相關檔案」的最小範圍
- 是否把 `statement_timeout` 從 120s 拉到 300s
- `CsvImportDialog.tsx` 要不要一併採用（我會先做逐行對照後回報）

如果你直接說「全部套」，我也可以整包導入，但會先幫你列出被覆蓋的檔案清單再動手。
