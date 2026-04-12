const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const { email, app_url } = await req.json()
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: '請提供 Email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Find user by email
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
    if (listErr) throw listErr

    const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
    if (!user) {
      // Don't reveal whether user exists
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate token
    const token = crypto.randomUUID() + '-' + crypto.randomUUID()
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

    await supabase.from('password_reset_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })

    const baseUrl = app_url || 'https://id-preview--8b8c1b89-a942-4abc-ad82-e429efb965cb.lovable.app'
    const resetLink = `${baseUrl}/auth?reset_token=${token}`

    const emailHtml = `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>重設密碼</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 20px; margin: 0; }
        .container { max-width: 480px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        h1 { color: #1a1a1a; font-size: 22px; margin-bottom: 16px; }
        p { color: #555; font-size: 14px; line-height: 1.6; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0; }
        .footer { margin-top: 28px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 16px; }
    </style>
</head>
<body>
<div class="container">
    <h1>重設您的密碼</h1>
    <p>您好，我們收到您的密碼重設請求。</p>
    <p>請點擊以下按鈕重設密碼（連結有效期為 1 小時）：</p>
    <p style="text-align:center;"><a href="${resetLink}" class="btn">重設密碼</a></p>
    <p style="font-size:12px;color:#999;">如果按鈕無法點擊，請複製以下網址到瀏覽器：<br/>${resetLink}</p>
    <div class="footer">
        <p>如果您沒有申請重設密碼，請忽略此信件。</p>
        <p>— RICH系統團隊</p>
    </div>
</div>
</body>
</html>`

    const resendRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'RICH系統 <onboarding@resend.dev>',
        to: [email],
        subject: '重設您的密碼 — RICH系統',
        html: emailHtml,
      }),
    })

    const resendData = await resendRes.json()
    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      return new Response(JSON.stringify({ error: '寄信失敗，請稍後再試' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('send-reset-email error:', err)
    return new Response(JSON.stringify({ error: '系統錯誤，請稍後再試' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
