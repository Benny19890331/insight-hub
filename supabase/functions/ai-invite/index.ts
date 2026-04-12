import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { contact, insights } = await req.json();
    if (!contact) {
      return new Response(JSON.stringify({ error: "Missing contact data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const genderText = contact.gender === "male" ? "男性" : contact.gender === "female" ? "女性" : "";
    const honorific = contact.nickname
      ? contact.nickname
      : contact.gender === "female"
      ? `${contact.name} 姐`
      : contact.gender === "male"
      ? `${contact.name} 哥`
      : contact.name;

    const heatMap: Record<string, string> = {
      cold: "冷（初次接觸、尚不熟悉）",
      warm: "溫（已有接觸、有一定好感）",
      hot: "熱（高度興趣、即將成交）",
      loyal: "忠實（老客戶、已多次購買、可發展為經銷夥伴）",
    };

    const systemPrompt = `你是一位善於人際互動的文案高手。你的任務是幫使用者撰寫一封給「${honorific}」的訊息，用途可能是打招呼、噓寒問暖、關心近況、或是邀約見面/活動。

要求：
- 語氣要像真正的朋友傳訊息，自然口語、有溫度，不要像罐頭訊息
- 根據熱度等級調整語氣：
  冷 → 輕鬆破冰、不給壓力，像是久違的朋友打聲招呼
  溫 → 自然關心近況，順勢提到可以一起做什麼
  熱 → 熱情邀約，展現期待感
  忠實 → 老朋友語氣，可以談更深入的合作或升級話題
- 如果有產品標籤，自然融入生活場景，不要硬推
- 如果有背景資訊，用來找到共同話題或貼近對方生活
- 如果有特殊註記，巧妙參考但不要直接複述
- 適當使用 emoji 增加親切感（2-4 個即可）
- 稱呼使用「${honorific}」
- 訊息長度約 120-200 字，分 2-3 段（開場關心、中段話題/邀約、結尾）
- 繁體中文，台灣用語
- 不要用「親愛的」、「您好」等制式開頭，直接用稱呼開始
- 每次生成都要有不同的切入角度和風格

嚴格禁止：
- 不要出現「業務員」、「銷售員」、「推銷」、「直銷」、「傳銷」等詞彙
- 不要使用「成交」、「業績」、「下線」等商業術語
- 用「分享」取代「推薦」、「銷售」
- 不要用「客戶」稱呼對方
- 整體語氣是朋友間的關心與互動，不是商業文案`;

    let insightsBlock = "";
    if (insights) {
      insightsBlock = `
【AI 分析報告(C單) 參考】
現況總結：${insights.summary || "無"}
特性標籤：${(insights.tags || []).join("、") || "無"}
下一步建議：${insights.next_action || "無"}

請將以上分析洞察自然融入訊息中，讓內容更貼近對方的狀態與需求。
`;
    }

    const userPrompt = `請根據以下客戶資料撰寫一封個人化邀約訊息：

姓名：${contact.name}
稱呼：${honorific}
${genderText ? `性別：${genderText}` : ""}
地區：${contact.region || "未知"}
背景/職業：${contact.background || "未知"}
熱度：${heatMap[contact.heat] || "未知"}
當前狀態：${(contact.statuses || []).join("、") || "無"}
關注產品：${(contact.productTags || []).join("、") || "無特定產品"}
特殊註記：${contact.notes || "無"}
聯絡方式：${contact.contactMethod || "未知"}
最後聯絡日期：${contact.lastContactDate || "未知"}
${insightsBlock}
請直接輸出邀約訊息內容，不要加任何前綴說明。`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI 請求過於頻繁，請稍後再試" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI 額度不足，請至設定頁面加值" }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI 生成失敗，請稍後再試" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-invite error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
