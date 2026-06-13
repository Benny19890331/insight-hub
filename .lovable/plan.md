# 修復「手機/桌機登入後永遠卡在骨架畫面」

## 根本原因（已確認）
DB 日誌顯示 `canceling statement due to statement timeout`，PostgREST 抓 `contacts` 時被資料庫切掉；前端 `useContacts.fetchContacts` 拋錯顯示「載入資料失敗」，於是畫面只剩骨架。
- RLS 政策 `auth.uid() = user_id` 會對每一列重新呼叫 `auth.uid()`（Supabase 已知效能反模式）。
- `order by created_at desc` 沒有匹配的部分索引，要做 sort。
- `select("*")` 把所有欄位（含 created_at、updated_at 等不需要的）一起傳。
- 自開機以來已累積 93,544 次 rollback，幾乎都是這個逾時造成的。

## 修改內容

### 1. SQL migration：優化 RLS + 補索引
針對 `contacts`、`interactions`、`contact_insights` 三張表，把 RLS 政策中的 `auth.uid()` 包成 `(select auth.uid())`（讓 Postgres 只計算一次）。

新增部分索引給最常打的查詢：
```sql
create index if not exists idx_contacts_user_active_created
  on public.contacts (user_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_interactions_user_date
  on public.interactions (user_id, date desc);
```

### 2. `src/hooks/useContacts.ts` 瘦身
- `contacts` 的 `select("*")` 改成明列需要的欄位（去掉 created_at 等沒用到的，減少 payload 與 JSON 序列化時間）。
- `interactions` 的 `select("*")` 同樣改成 `id, contact_id, date, summary`。
- 在 catch 區塊加上 `console.error(err)` 方便日後追蹤實際錯誤訊息。

### 3. 不動以下項目
- PWA / service worker（畫面有渲染、不是 SW 卡住）。
- AI Edge Functions（與此問題無關）。
- 認證流程（登入本身正常）。

## 預期效果
- RLS 子查詢化後，1800 筆查詢的執行時間預期從「偶爾逾時 (>8s)」降到穩定 <200ms。
- 部分索引讓 `order by created_at desc where deleted_at is null` 不需 sort。
- 手機 / 桌機登入後骨架會在 1 秒內被資料填滿。

## 後續建議（不在本次修改內，供參考）
如果之後總筆數持續往 5000+ 成長，可考慮在 Lovable Cloud → Backend → Advanced settings 升級資料庫實例大小，以承載更高的併發。
