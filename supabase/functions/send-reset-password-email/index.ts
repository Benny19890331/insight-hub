const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GMAIL_USER = Deno.env.get('GMAIL_USER')
    if (!GMAIL_USER) throw new Error('GMAIL_USER not configured')

    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!GMAIL_APP_PASSWORD) throw new Error('GMAIL_APP_PASSWORD not configured')

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

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    await supabase.from('password_reset_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })

    const baseUrl = app_url || 'https://id-preview--8b8c1b89-a942-4abc-ad82-e429efb965cb.lovable.app'
    const confirmationURL = `${baseUrl}/auth?reset_token=${token}`

    const emailHtml = `<div style="font-family: sans-serif;">
  <h2>重設密碼通知</h2>
  <p>您好，我們收到一筆重設密碼的請求。</p>
  <p>請點選下方連結來設定您的新密碼：</p>
  <p><a href="${confirmationURL}" style="display:inline-block; padding:10px 20px; background-color:#2563eb; color:#ffffff; text-decoration:none; border-radius:5px;">立即重設密碼</a></p>
  <br>
  <p>如果按鈕失效，請複製此網址到瀏覽器：</p>
  <p>${confirmationURL}</p>
  <hr>
  <p style="font-size:12px; color:#666;">這是系統自動發送的信件，請勿直接回覆。</p>
  <p>RICH系統 敬上</p>
</div>`

    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    })

    await client.send({
      from: `RICH系統 <${GMAIL_USER}>`,
      to: email,
      subject: '重設您的密碼 — RICH系統',
      content: '請使用支援 HTML 的郵件客戶端查看此信件。',
      html: emailHtml,
    })

    await client.close()

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('send-reset-password-email error:', err)
    return new Response(JSON.stringify({ error: '系統錯誤，請稍後再試' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
