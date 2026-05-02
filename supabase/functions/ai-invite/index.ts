import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

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

    const systemPrompt = `你是一位善於人際互動的文案高手。請為「${honorific}」生成 **三段不同語氣** 的邀約訊息草稿，方便領袖依場合直接複製傳訊息。

每段訊息要求：
- 自然口語、有溫度，像真正朋友傳訊息，不要罐頭感
- 根據熱度等級調整語氣（冷=破冰／溫=關心話題／熱=熱情邀約／忠實=老朋友深聊）
- 自然融入產品標籤、背景、特殊註記，但不要硬推、不要直接複述
- 適當使用 emoji（2-4 個）
- 稱呼使用「${honorific}」
- 長度約 120-200 字，分 2-3 段（開場關心、中段話題/邀約、結尾）
- 繁體中文、台灣口語
- 不要用「親愛的」、「您好」等制式開頭，直接用稱呼開始

三段語氣定義（必須回三段）：
1. tone="親切寒暄"：先關心近況、輕鬆破冰，再自然帶到邀約
2. tone="專業邀約"：直接、有條理、強調價值與時間，適合忙碌或理性的對象
3. tone="好友直球"：像熟朋友直接開口，口語、有感情，適合熱度高或交情好的對象

嚴格禁止：
- 不要出現「業務員」、「銷售員」、「推銷」、「直銷」、「傳銷」、「客戶」、「成交」、「業績」、「下線」
- 用「分享」取代「推薦」、「銷售」`;

    let insightsBlock = "";
    if (insights) {
      insightsBlock = `
【AI 分析報告(C單) 參考】
現況總結：${insights.summary || "無"}
特性標籤：${(insights.tags || []).join("、") || "無"}
下一步建議：${insights.next_action || "無"}

請將以上分析洞察自然融入訊息中。
`;
    }

    const userPrompt = `客戶資料：
姓名：${contact.name}
稱呼：${honorific}
${genderText ? `性別：${genderText}` : ""}
地區：${contact.region || "未知"}
背景/職業：${contact.background || "未知"}
熱度：${heatMap[contact.heat] || "未知"}
當前狀態：${(contact.statuses || []).join("、") || "無"}
關注產品：${(contact.productTags || contact.product_tags || []).join("、") || "無特定產品"}
特殊註記：${contact.notes || "無"}
聯絡方式：${contact.contactMethod || contact.contact_method || "未知"}
最後聯絡日期：${contact.lastContactDate || contact.last_contact_date || "未知"}
${insightsBlock}
請呼叫 submit_invite_scripts 工具回傳三段不同語氣的邀約訊息。`;

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
          tools: [
            {
              type: "function",
              function: {
                name: "submit_invite_scripts",
                description: "Submit three invitation scripts in different tones",
                parameters: {
                  type: "object",
                  properties: {
                    scripts: {
                      type: "array",
                      description: "三段不同語氣的邀約訊息，必須剛好 3 個",
                      items: {
                        type: "object",
                        properties: {
                          tone: { type: "string", enum: ["親切寒暄", "專業邀約", "好友直球"] },
                          script: { type: "string" },
                        },
                        required: ["tone", "script"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["scripts"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "submit_invite_scripts" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI 請求過於頻繁，請稍後再試" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 額度不足，請至設定頁面加值" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI 生成失敗，請稍後再試" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const message = aiResult.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];
    let scripts: Array<{ tone: string; script: string }> = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      scripts = Array.isArray(parsed?.scripts) ? parsed.scripts : [];
    }

    // Fallback: sometimes model returns JSON in content instead of tool call.
    if (scripts.length === 0 && typeof message?.content === "string") {
      const content = message.content.trim();
      try {
        const parsed = JSON.parse(content);
        scripts = Array.isArray(parsed?.scripts) ? parsed.scripts : [];
      } catch {
        const chunks = content
          .split(/\n{2,}/)
          .map((s: string) => s.trim())
          .filter(Boolean);
        scripts = chunks.slice(0, 3).map((script: string, idx: number) => ({
          tone: ["親切寒暄", "專業邀約", "好友直球"][idx] || `版本${idx + 1}`,
          script,
        }));
      }
    }

    scripts = scripts
      .map((s) => ({
        tone: String(s?.tone || "").trim(),
        script: String(s?.script || "")
          .replace(/\\\\\\\\r\\\\\\\\n/g, "\n")
          .replace(/\\\\\\\\n/g, "\n")
          .replace(/\\\\r\\\\n/g, "\n")
          .replace(/\\\\n/g, "\n")
          .replace(/\\r\\n/g, "\n")
          .replace(/\\n/g, "\n")
          .trim(),
      }))
      .filter((s) => s.tone && s.script);

    if (contact?.id && scripts.length > 0) {
      const { error: upsertErr } = await supabase
        .from("contact_insights")
        .upsert(
          {
            contact_id: contact.id,
            user_id: user.id,
            invite_scripts: scripts,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "contact_id" }
        );
      if (upsertErr) console.error("Failed to save invite_scripts:", upsertErr);
    }

    return new Response(JSON.stringify({ scripts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-invite error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
