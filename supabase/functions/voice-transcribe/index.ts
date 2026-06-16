const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { logAiUsage } from "../_shared/log-ai-usage.ts";

// 長錄音聽寫：把整段錄音交給 Gemini 的多模態耳朵直接聽寫。
// 與瀏覽器即時聽寫不同，Gemini 能處理台語、國台語夾雜、慢語速與長停頓。

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

    const { audio, mimeType } = await req.json();
    if (!audio || !mimeType) {
      return new Response(JSON.stringify({ error: '缺少錄音資料' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: audio } },
              { text: [
                '你是專精台灣本土語言的逐字稿聽寫員，特別熟悉「台語（台灣閩南語 / Hokkien / Tâi-gí）」、國語（華語）、以及國台語夾雜口語。',
                '請將這段錄音「完整、逐字」聽寫成自然通順的繁體中文。',
                '重要規則：',
                '1. 說話者很可能整段都在講台語，或國台語混講；請耐心辨識台語發音與台語慣用語，不要因為不是國語就漏掉或跳過。',
                '2. 台語請翻成意思相同的自然繁體中文書寫（例如「呷飽未」→「吃飽了嗎」、「逗陣」→「一起」、「揪」→「邀」、「厝」→「家」、「水」→「漂亮」、「轉去」→「回去」、「拍給」→「打給」）。',
                '3. 語速可能很慢、有長停頓、有口頭禪、有重複，請完整聽完整段，不要截斷、不要省略、不要自行摘要。',
                '4. 人名、地名、產品名、品牌名請保留原音，用最常見的中文寫法。',
                '5. 不要加任何說明、引號、標題、Markdown、前後綴；只輸出聽寫後的純文字本身。',
                '6. 若整段確實聽不清楚或沒有人聲，回覆「（聽不清楚）」即可。',
              ].join('\n') },
            ],
          }],
          generationConfig: { temperature: 0.2 },
        }),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('Gemini transcribe error:', data);
      return new Response(JSON.stringify({ error: '聽寫服務暫時無法使用' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const transcript = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
    await logAiUsage(req.headers.get('Authorization'), 'voice-transcribe');

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('voice-transcribe error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
