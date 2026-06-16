## 目標

新增聯絡人 Dialog 上方目前有四個主要功能按鈕（語音 🎙️、文字 ⌨️、長錄音 🎵、數位名片診斷 📇），現在尺寸與樣式不一致，導致下方的狀態文字（例如「🎙️ 語音 ｜ ⌨️ 文字 ｜ 🎵 長錄音（會聽台語）」）容易被擠斷行或破版。本次調整將四個按鈕統一成相同樣式、各佔畫面寬度 1/4，並去掉「數位名片診斷」的 📇 圖示。

## 變更內容

### 1. `src/components/VoiceInputButton.tsx`
- 將上方三顆圓形按鈕（語音、文字、長錄音）改成**等寬方形圓角**按鈕，外層容器改為 `grid grid-cols-4 w-full gap-2`，並開放第四格給父層的「數位名片診斷」按鈕。
- 作法：把 `VoiceInputButton` 內部的三顆按鈕容器 `<div className="flex items-center gap-3">` 改為 `<div className="grid grid-cols-3 w-full gap-2">`，每顆按鈕 `w-full h-12 rounded-xl`，內部 icon 置中，移除個別大小差異（原本是 w-12/w-10）。
- 外層 wrapper 改為 `w-full`（已是），讓父層可控制總寬。
- 下方狀態文字保留現有 `whitespace-nowrap overflow-x-auto`，但字級保持 `text-[10px]`，因為現在每格較窄，文字不再會被外框撐爆。

### 2. `src/components/AddContactDialog.tsx`（line 185–218 區塊）
- 把整個按鈕列 `<div className="flex justify-center …">` 改成兩段：
  - 上排：`<div className="grid grid-cols-4 w-full gap-2 …">`，前三格由 `VoiceInputButton` 自己佔滿（改成接受外層 grid），第四格為「數位名片診斷」按鈕。
  - 為避免架構耦合，採取較單純的作法：
    - 改 `VoiceInputButton` 為**只渲染三顆等寬按鈕**（不再自己撐 grid-cols-3），而是 `contents` 或 `grid-cols-subgrid` 不可靠 → 改採：父層 `grid grid-cols-4 gap-2`，`VoiceInputButton` 內三顆按鈕外層用 `display: contents`，讓三顆按鈕直接成為父 grid 的子項目。
    - 第四格為診斷按鈕，套用與其他三顆相同的 `w-full h-12 rounded-xl` 外觀，**保留彩虹漸層邊框**作為視覺亮點，但**移除 📇 emoji**，只留「數位名片診斷」文字（漸層字色保留）。
- 文字狀態列移到按鈕列下方（仍由 `VoiceInputButton` 渲染），佔滿整個 `w-full`，置中顯示，這樣「🎙️ 語音 ｜ ⌨️ 文字 ｜ 🎵 長錄音（會聽台語）」一定能完整顯示在一行（窄螢幕仍可橫向捲動）。

### 3. 互動與行為
- 不更動任何錄音、文字輸入、AI 解析、診斷彈窗的邏輯，只動排版與圖示。
- 不更動 `AddInteractionDialog.tsx`（裡面的 VoiceInputButton 沒有第四顆診斷按鈕，但因為三顆按鈕改為 `display: contents`，需要父層也是 grid；該檔的 VoiceInputButton 父層只是 flex，**需要同步把該檔內 `<VoiceInputButton>` 外層改為 `grid grid-cols-3 gap-2 w-full`**，讓三顆按鈕在互動 dialog 也維持等寬一致樣式）。

### 4. 驗證
- 用 `browser--view_preview` 在桌機與行動寬度（414px）各檢視一次新增聯絡人 Dialog，確認四顆按鈕等寬、文字「🎵 長錄音（會聽台語）」不再被截斷或破版。
