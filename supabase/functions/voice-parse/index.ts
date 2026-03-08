import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, mode } = await req.json();
    // mode: "contact" or "interaction"

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "請提供語音文字內容" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = mode === "interaction"
      ? `你是一個專業的 CRM 資料解析助理。請從使用者的語音文字中，精準擷取互動紀錄資訊。
嚴格只回傳 JSON 格式，不要包含任何 markdown 標記或額外文字。
JSON 必須包含以下欄位：
- date (YYYY-MM-DD 格式，若使用者說「今天」就用今天日期，若無法判斷則留空字串)
- summary (互動內容的摘要字串，整理成流暢的中文句子)

範例輸出：{"date":"2026-03-08","summary":"在咖啡廳見面，聊到健康保健話題，對識霸有興趣"}

今天的日期是 ${new Date().toISOString().split("T")[0]}。`
      : `你是一個專業的 CRM 資料解析助理。請從使用者的語音文字中，精準擷取客戶資訊。
嚴格只回傳 JSON 格式，不要包含任何 markdown 標記或額外文字。
JSON 必須包含以下欄位：
- name (姓名字串，若無法判斷則留空字串)
- nickname (綽號字串，若無則留空字串)
- region (地區字串，若無則留空字串)
- background (背景/職業字串，若無則留空字串)
- birthday (YYYY-MM-DD 格式，若無則留空字串)
- gender (性別："male"、"female"、"other" 或空字串)
- contactMethod (聯絡方式字串，若無則留空字串)
- products (感興趣產品的字串陣列，可選值：識霸、水素水、明利多、喚活、普利活、AND、晨星、柔緹，若無則空陣列)
- heat (熱度判斷："cold"、"warm"、"hot"、"loyal"，根據語氣判斷，預設 "warm")
- notes (其他備註字串，將無法歸類的資訊放在這裡)

範例輸出：{"name":"王小明","nickname":"小明","region":"台北市","background":"工程師","birthday":"1990-05-15","gender":"male","contactMethod":"LINE: wang_ming","products":["識霸","水素水"],"heat":"warm","notes":"對健康保健有興趣"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI 請求過於頻繁，請稍後再試" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 額度不足，請加值後再試" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI 解析失敗" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? "";
    
    // Strip markdown code fences if present
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify({ result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      console.error("Failed to parse AI response as JSON:", content);
      return new Response(JSON.stringify({ error: "AI 回傳格式異常，請重試", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("voice-parse error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
