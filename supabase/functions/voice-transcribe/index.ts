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
              { text: '請完整聽寫這段錄音為繁體中文。說話者可能說台語、國語，或國台語夾雜，語速可能很慢、有長停頓，請耐心聽完整段不要漏字。若聽到台語請翻成自然通順的繁體中文書寫；人名、產品名、品牌名請保留原音。只輸出聽寫後的文字本身，不要加任何說明、引號或前後綴。' },
            ],
          }],
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
