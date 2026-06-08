// 共用：保健食品 × 多層次傳銷 領域知識
// 從資料庫讀取（管理員可編輯），fallback 用內建版本
// 為了省 token，提供 getDomainKnowledgeIfRelevant(text)：
//   只在輸入文字命中產品名 / 直銷術語時才注入完整知識，否則回傳極簡提示。

const FALLBACK_DOMAIN_KNOWLEDGE = `
【領域背景】
本系統服務於「保健食品 × 多層次傳銷（直銷）」事業夥伴。
請以「事業夥伴、健康分享」的正向語氣理解，
**絕對不要**使用「客戶、推銷、成交、銷售」等冷感商業字眼。

【專有產品名詞字典】
- 識霸：超級綜合植化素。
- 明利多：加強版植化素，在「識霸」的基礎上多添加山桑子萃取物，效果可達 3.2 倍。
- 水素水：含氫水，具有清除羥基自由基的功能。
- 喚活：能刺激人體本身的幹細胞，讓新長出的細胞健康正常。

【辨識規則】
1. 上述詞彙視為正式產品名稱原樣保留。
2. 語音輸入近音字請自動對應到正確名稱。
3. 不可捏造未列出的成分、療效、適應症或醫療宣稱。
`.trim();

// 永遠注入的極簡提示（不到 60 字，幾乎不耗 token）
const MINIMAL_HINT =
  "【語氣】保健食品×直銷事業夥伴語境，禁用「客戶/推銷/成交/銷售」，改用「夥伴/分享」。";

// 內建近音字 / 直銷術語觸發詞（與管理員字典結合）
const BUILTIN_TRIGGERS = [
  // 產品近音
  "識霸", "是霸", "識爸", "明利多", "明力多", "名利多",
  "水素水", "水速水", "喚活", "煥活", "換活",
  // 直銷術語
  "上線", "下線", "組織", "業績", "推薦", "事業夥伴",
  "保健", "植化素", "幹細胞", "自由基",
];

let cached: { content: string; triggers: string[]; at: number } | null = null;
const TTL_MS = 60_000;

async function loadKnowledge(): Promise<{ content: string; triggers: string[] }> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached;

  let content = FALLBACK_DOMAIN_KNOWLEDGE;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && key) {
      const res = await fetch(
        `${url}/rest/v1/domain_knowledge?id=eq.1&select=content`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } },
      );
      if (res.ok) {
        const rows = await res.json();
        const c = rows?.[0]?.content?.trim();
        if (c) content = c;
      }
    }
  } catch { /* fallback */ }

  // 從字典段擷取「- 名稱：」的名稱當觸發詞
  const dictNames: string[] = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*[-•]\s*([^：:]+)[：:]/);
    if (m) dictNames.push(m[1].trim());
  }
  const triggers = Array.from(new Set([...dictNames, ...BUILTIN_TRIGGERS]))
    .filter((s) => s.length >= 2);

  cached = { content, triggers, at: Date.now() };
  return cached;
}

/**
 * 取得完整領域知識（總是注入）。建議只在使用者明確要求「使用知識庫」時用。
 */
export async function getDomainKnowledge(): Promise<string> {
  return (await loadKnowledge()).content;
}

/**
 * 省 token 版：只在輸入文字命中觸發詞時才注入完整知識。
 * 沒命中就只回傳一行極簡語氣提示。
 */
export async function getDomainKnowledgeIfRelevant(text: string): Promise<string> {
  const { content, triggers } = await loadKnowledge();
  if (!text) return MINIMAL_HINT;
  const hit = triggers.some((t) => text.includes(t));
  return hit ? content : MINIMAL_HINT;
}

export const DOMAIN_KNOWLEDGE = FALLBACK_DOMAIN_KNOWLEDGE;
