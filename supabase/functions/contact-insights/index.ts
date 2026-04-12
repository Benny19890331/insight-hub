
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

    // Fetch contact
    const { data: contact, error: cErr } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contact_id)
      .eq("user_id", user.id)
      .single();
    if (cErr || !contact) throw new Error("Contact not found");

    // Fetch interactions
    const { data: interactions } = await supabase
      .from("interactions")
      .select("date, summary")
      .eq("contact_id", contact_id)
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(50);

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
      interactions: interactions ?? [],
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `你是一位頂尖的客戶經營顧問。請根據以下該客戶的基本資料與歷史互動紀錄，提煉出重點分析。

嚴格使用 tool calling 回傳結果，欄位說明：
- summary: 用 150 字以內總結客戶現況、熱度與經營重點
- tags: 萃取客戶的特性、興趣或痛點標籤（例如：重視健康、預算考量、家庭導向），至少 2 個最多 6 個
- next_action: 根據最後一次互動與客戶狀態，給出下一步的具體邀約或跟進建議（50字以內）

重要規則：
- 請使用繁體中文，口吻專業但親切
- 絕對不要使用「業務員」、「銷售員」、「推銷」等詞彙，改用「你」或「我們」來稱呼使用者
- 建議語氣要像是朋友間的分享與關心，而非商業推銷`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
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
