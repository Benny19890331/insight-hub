
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { contact_id } = await req.json();
    if (!contact_id) throw new Error("Missing contact_id");

    // Fetch contact & interactions in parallel
    const [contactRes, interactionsRes] = await Promise.all([
      supabase.from("contacts").select("name,nickname,region,background,statuses,heat,product_tags,notes,gender,last_contact_date").eq("id", contact_id).eq("user_id", user.id).single(),
      supabase.from("interactions").select("date, summary").eq("contact_id", contact_id).eq("user_id", user.id).order("date", { ascending: false }).limit(20),
    ]);
    if (contactRes.error || !contactRes.data) throw new Error("Contact not found");
    const contact = contactRes.data;

    const contactData = {
      name: contact.name,
      nickname: contact.nickname,
      region: contact.region,
      background: contact.background,
      statuses: contact.statuses,
      heat: contact.heat,
      product_tags: contact.product_tags,
      notes: contact.notes,
      gender: contact.gender,
      last_contact_date: contact.last_contact_date,
      interactions: interactionsRes.data ?? [],
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const contactName = contact.nickname || contact.name;
    const systemPrompt = `你是一位頂尖的人脈經營顧問，擅長從有限資料中萃取關鍵洞察。這份分析報告是給「領袖」快速了解「${contactName}」這個人，必須一眼看懂、條列清楚，方便領袖判斷如何借力與邀約。

嚴格使用 tool calling 回傳結果，欄位說明：

- summary: **重點條列式**摘要（不是段落文章），給領袖快速掃過這個人。請依照下列固定順序輸出，每一項一行，使用「• 項目名稱：內容」格式，項目之間用換行符號 \\n 分隔。固定順序如下：
  • 姓名：本名與暱稱
  • 年齡：若無資料寫「資料不足」
  • 背景：出身、家庭、地區等背景簡述
  • 職務：目前工作或專業
  • 信任感：目前與我們的信任程度（高/中/低 + 一句說明，依互動熱度與紀錄判斷）
  • 想找哪位領袖借力：建議借力的領袖類型或具體方向（依其需求/背景推論）
  • 需求：目前最可能的需求或痛點
  • 關係：與我們的關係深淺、認識來源（推薦人）
  • 如何邀約：最適合的邀約方式與切入點（一句話）
  • 夢想：可能的人生目標或渴望（如資料不足可合理推測並標註「推測」）
  • 經濟狀況：可觀察到的經濟條件（如資料不足寫「資料不足」）
  • 興趣愛好：從產品標籤、互動紀錄歸納
  • 附註：其他值得提醒領袖的細節（放最後）

- tags: 萃取此人的特性、興趣或痛點標籤，至少 3 個最多 8 個，盡量具體
- next_action: 下一步具體邀約或跟進建議（80字以內），需含時間建議或話題切入點

重要規則：
- 繁體中文，口吻像內部經營筆記
- 全文以「${contactName}」稱呼，絕對不要用「客戶」、「該客戶」、「此客戶」
- 不要使用「業務員」、「銷售員」、「推銷」，可用「夥伴」或「我們」
- 只根據提供的資料分析，資料不足的欄位請寫「資料不足，建議下次互動留意」，不要編造
- summary 每一項都要出現，不可省略，順序不可調動`;

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
          { role: "user", content: JSON.stringify(contactData) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_insights",
              description: "Submit the analyzed insights for the contact",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "150字以內總結" },
                  tags: { type: "array", items: { type: "string" }, description: "特性標籤" },
                  next_action: { type: "string", description: "下一步建議" },
                },
                required: ["summary", "tags", "next_action"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI 請求過於頻繁，請稍後再試" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 額度不足，請補充點數" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const insights = JSON.parse(toolCall.function.arguments);

    // Upsert into contact_insights
    const { error: upsertErr } = await supabase
      .from("contact_insights")
      .upsert({
        contact_id,
        user_id: user.id,
        summary: insights.summary,
        tags: insights.tags,
        next_action: insights.next_action,
        updated_at: new Date().toISOString(),
      }, { onConflict: "contact_id" });

    if (upsertErr) {
      console.error("Upsert error:", upsertErr);
      throw new Error("Failed to save insights");
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("contact-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
