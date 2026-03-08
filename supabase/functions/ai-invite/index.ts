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

    const { contact } = await req.json();
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

    const systemPrompt = `你是一位頂尖的直銷/保健品事業邀約文案專家。你的任務是根據客戶資料，撰寫一封溫暖、自然、有說服力的個人化邀約訊息。

要求：
- 語氣要像朋友之間的自然對話，不要太商業化或制式
- 根據客戶的熱度等級調整語氣強度：冷客戶要輕鬆無壓力、熱客戶要積極邀約、忠實客戶要談合作升級
- 如果有產品標籤，要自然地提到相關產品
- 如果有客戶背景/職業資訊，要巧妙地將產品與其生活場景結合
- 如果有特殊註記，要參考這些資訊來客製化內容
- 適當使用 emoji 增加親切感（不要過多）
- 稱呼要使用「${honorific}」
- 訊息長度約 150-250 字，分 3 段（開場白、產品/活動介紹、結尾邀約）
- 繁體中文，台灣用語
- 不要使用「親愛的」這類過於正式的開頭
- 每次生成都要有不同的風格和切入角度`;

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
