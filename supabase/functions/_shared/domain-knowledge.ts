// 共用：保健食品 × 多層次傳銷 領域知識
// 從資料庫讀取（管理員可編輯），fallback 用內建版本

const FALLBACK_DOMAIN_KNOWLEDGE = `
【領域背景】
本系統服務於「保健食品 × 多層次傳銷（直銷）」事業夥伴。
對話中常出現：上線 / 下線 / 開發 / 組織 / 業績 / 推薦 / 分享。
請以「事業夥伴、健康分享」的正向語氣理解，
**絕對不要**使用「客戶、推銷、成交、銷售」等冷感商業字眼。

【專有產品名詞字典】（這些是正式產品名稱，請務必正確辨識，不要翻譯、不要改寫、不要當錯字修正）
- 識霸：超級綜合植化素。
- 明利多：加強版植化素，在「識霸」的基礎上多添加山桑子萃取物，效果可達 3.2 倍。
- 水素水：含氫水，具有清除羥基自由基的功能。
- 喚活：能刺激人體本身的幹細胞，讓新長出的細胞健康正常。

【辨識規則】
1. 看到上述詞彙，視為正式產品名稱原樣保留。
2. 若是語音輸入近音字，請自動對應到正確名稱。
3. 提及產品時不可捏造未列出的成分、療效、適應症或醫療宣稱。
4. 若使用者沒提到產品，不要硬塞產品資訊。
`.trim();

// 簡易快取，避免每次呼叫都打 DB
let cached: { content: string; at: number } | null = null;
const TTL_MS = 60_000; // 1 分鐘

export async function getDomainKnowledge(): Promise<string> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.content;

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return FALLBACK_DOMAIN_KNOWLEDGE;

    const res = await fetch(
      `${url}/rest/v1/domain_knowledge?id=eq.1&select=content`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return FALLBACK_DOMAIN_KNOWLEDGE;
    const rows = await res.json();
    const content = rows?.[0]?.content?.trim();
    if (!content) return FALLBACK_DOMAIN_KNOWLEDGE;
    cached = { content, at: Date.now() };
    return content;
  } catch {
    return FALLBACK_DOMAIN_KNOWLEDGE;
  }
}

// 同步版本（用內建 fallback），保留作為向後相容
export const DOMAIN_KNOWLEDGE = FALLBACK_DOMAIN_KNOWLEDGE;
