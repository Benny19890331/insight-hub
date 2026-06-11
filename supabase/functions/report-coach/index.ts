const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { logAiUsage } from "../_shared/log-ai-usage.ts";

const SYSTEM_PROMPT = `你是「人脈經營教練」，一位永遠溫暖、樂觀、最會看見別人努力的教練。使用者是人脈經營的夥伴，年齡層很廣，有些是長輩。請用繁體中文（台灣用語）回應。

嚴格遵守以下規則：
1. 開頭先具體讚美，至少找出 2-3 個亮點，必須引用實際數字（例如「本月新增了 5 位新朋友，太棒了！」）。數字再小都要找到值得肯定的地方——光是有持續記錄這件事本身就值得大大讚美。
2. 語氣像溫暖的啦啦隊長加上知心好友，多用鼓勵的話，可以適量使用 emoji（2-4 個）。
3. 建議最多 1-2 點，用「或許可以試試」「有空的時候不妨」這種輕鬆口吻，給出具體的小方向（例如優先關心哪一類朋友）。
4. 絕對禁止：批評、比較、施壓、使用「太少」「不足」「應該」「必須」「落後」等字眼、提到失敗或不夠努力。
5. 全文 150~250 字，分成 2-3 個短段落，每段之間空一行。
6. 結尾用一句溫暖打氣的話收尾。`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GOOGLE_AI_KEY = Deno.env.get('GOOGLE_AI_KEY');
    if (!GOOGLE_AI_KEY) throw new Error('GOOGLE_AI_KEY is not configured');

    const { stats } = await req.json();
    if (!stats || typeof stats !== 'object') {
      return new Response(JSON.stringify({ error: '缺少統計資料' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userPrompt = `這是這位夥伴目前的人脈經營數據（JSON）：
${JSON.stringify(stats, null, 2)}

請依照規則，給出你的鼓勵與輕量建議。`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: 600 },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('Google AI error:', data);
      return new Response(JSON.stringify({ error: '教練暫時連不上線' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    await logAiUsage(req.headers.get('Authorization'), 'report-coach');

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('report-coach error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
