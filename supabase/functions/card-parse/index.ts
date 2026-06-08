import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getDomainKnowledgeIfRelevant } from "../_shared/domain-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { raw, partial } = await req.json();
    if (!raw || typeof raw !== "string") {
      return new Response(JSON.stringify({ error: "請提供名片診斷原文" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const DOMAIN_KNOWLEDGE = await getDomainKnowledgeIfRelevant(raw);

    const systemPrompt = `${DOMAIN_KNOWLEDGE}

你是一個專業人格特質分析助理。使用者會貼上一份「AI 風格診斷」名片結果，內含受測者基本欄位與 10 題作答。
請你輸出嚴格 JSON（無 markdown），欄位如下：
- name: 受測者姓名（若原文已有 👤 受測者就用該值）
- type: 人格類型短句（如「領航為主」「穩健執行」），若原文有 🧬 類型就直接沿用
- state: 內在狀態短句（若原文有 🧠 內在狀態就沿用）
- heat: "cold" | "warm" | "hot" | "loyal"，依內在狀態語氣推斷，預設 "warm"
- summary: 80 字內中文，2-3 句濃縮人格特質與行動偏好（從 10 題作答歸納，不要逐題複述）

範例：{"name":"小胖","type":"領航為主","state":"我想突破事業","heat":"hot","summary":"偏好抓趨勢、先出手再優化；重視 SOP 與未來藍圖；不耐慢節奏，遇卡關傾向換路找新風口。"}

已知部分欄位（若空再請你補）：${JSON.stringify(partial ?? {})}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: raw },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI 請求過於頻繁，請稍後再試" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 額度不足，請加值後再試" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI 解析失敗" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? "";
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify({ result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "AI 回傳格式異常", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("card-parse error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
