
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
    const systemPrompt = `你是一位頂尖的人脈經營顧問，擅長從有限資料中萃取關鍵洞察。這份分析報告是給「領袖」快速了解「${contactName}」這個人，必須一眼看懂、條列清楚。

嚴格使用 tool calling 回傳結果，欄位說明：

- summary: **重點條列式**摘要（不是段落文章）。每一項一行，使用「• 項目名稱：內容」格式，項目之間用單一換行符號 \\n 分隔（**不要連續多個換行、不要在結尾加多餘的 \\n 或空的 •**）。請依照下列固定順序輸出，但**只列出有實質內容、且資料中真的提到或可合理推論的項目**，其餘**完全省略**（不要寫「資料不足」、「無」、「未知」、「待補」，也不要保留空白項目）：
  • 姓名
  • 年齡
  • 背景（出身、家庭、地區）
  • 職務（工作或專業）
  • 信任感（高/中/低 + 一句說明，依互動熱度與紀錄判斷）
  • 想找哪位領袖借力（**只有在「特殊註記 (notes)」明確提到「借力 / 借誰的力 / 想找 XX 介紹 / 想認識某類型領袖」等內容時才列出，否則整項省略，不要列**）
  • 需求（目前最可能的需求或痛點）
  • 關係（與我們的關係深淺、認識來源）
  • 如何邀約（最適合的邀約方式與切入點，一句話）
  • 夢想（人生目標或渴望，如為推測請標註「(推測)」）
  • 經濟狀況
  • 興趣愛好（從產品標籤、互動紀錄歸納）
  • 附註（其他值得提醒領袖的細節，放最後）

- tags: 萃取特性、興趣或痛點標籤，3～8 個，具體
- next_action: 下一步具體邀約或跟進建議（80字以內），含時間建議或話題切入點

重要規則：
- 繁體中文，內部經營筆記口吻
- 全文以「${contactName}」稱呼，不要用「客戶」、「該客戶」、「此客戶」、「業務員」、「銷售員」、「推銷」
- 只根據提供的資料分析，不要編造；資料不足的 summary 項目直接省略整行
- summary **結尾不可有多餘的換行或空 bullet**，最後一行就是最後一個有內容的項目`;

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
                  summary: { type: "string", description: "重點條列摘要" },
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

    // Sanitize summary: drop empty bullets, headers without content, and trailing junk
    if (typeof insights.summary === "string") {
      insights.summary = insights.summary
        .split(/\r?\n/)
        .map((l: string) => l.replace(/\s+$/, ""))
        .filter((l: string) => {
          const stripped = l.replace(/^[•\-\*]\s*/, "").trim();
          if (!stripped) return false;
          // pure punctuation / dangling bullet
          if (/^[•\-\*：:\s]*$/.test(stripped)) return false;
          // "項目：" with no content
          if (/^[^：:]{1,12}[：:]\s*$/.test(stripped)) return false;
          // explicit "no data" lines
          if (/(資料不足|無資料|尚無資料|無相關資料|未提供|未知|待補)/.test(stripped)) return false;
          return true;
        })
        .join("\n")
        // collapse any accidental double newlines
        .replace(/\n{2,}/g, "\n")
        // strip trailing bullets / whitespace
        .replace(/[\s•\-\*]+$/g, "")
        .trim();
    }

    // Upsert into contact_insights (invite_scripts now lives in ai-invite, store empty array)
    const { error: upsertErr } = await supabase
      .from("contact_insights")
      .upsert({
        contact_id,
        user_id: user.id,
        summary: insights.summary,
        tags: insights.tags,
        next_action: insights.next_action,
        invite_scripts: [],
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
