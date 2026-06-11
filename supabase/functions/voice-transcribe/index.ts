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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: audio } },
              { text: '請把這段錄音完整聽寫成繁體中文文字。說話的人可能講台語、國語，或國台語夾雜，語速可能很慢、有停頓，請耐心聽完整段。台語內容請翻譯成通順的中文書寫。只輸出聽寫後的文字，不要加任何說明或標點以外的符號。' },
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
