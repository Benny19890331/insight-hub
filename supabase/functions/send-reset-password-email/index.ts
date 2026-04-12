const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const toBase64 = (value: string) => {
  const bytes = textEncoder.encode(value)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

const toMimeHeader = (value: string) => `=?UTF-8?B?${toBase64(value)}?=`

const wrapBase64 = (value: string, width = 76) => {
  const chunks = value.match(new RegExp(`.{1,${width}}`, 'g'))
  return chunks?.join('\r\n') ?? ''
}

const readSmtpResponse = async (conn: Deno.Conn) => {
  const buffer = new Uint8Array(1024)
  let response = ''

  while (true) {
    const read = await conn.read(buffer)
    if (read === null) {
      throw new Error(`SMTP connection closed unexpectedly: ${response}`)
    }

    response += textDecoder.decode(buffer.subarray(0, read), { stream: true })
    const lines = response.split('\r\n').filter(Boolean)
    const lastLine = lines.at(-1)

    if (lastLine && /^\d{3} /.test(lastLine)) {
      return {
        code: Number(lastLine.slice(0, 3)),
        message: response,
      }
    }
  }
}

const writeSmtpCommand = async (conn: Deno.Conn, command: string, expectedCodes: number[]) => {
  await conn.write(textEncoder.encode(`${command}\r\n`))
  const response = await readSmtpResponse(conn)

  if (!expectedCodes.includes(response.code)) {
    throw new Error(`SMTP command failed (${command}): ${response.message}`)
  }

  return response
}

const sendViaGmailSmtp = async ({
  username,
  password,
  to,
  subject,
  html,
}: {
  username: string
  password: string
  to: string
  subject: string
  html: string
}) => {
  const conn = await Deno.connectTls({
    hostname: 'smtp.gmail.com',
    port: 465,
  })

  try {
    const greeting = await readSmtpResponse(conn)
    if (greeting.code !== 220) {
      throw new Error(`SMTP greeting failed: ${greeting.message}`)
    }

    await writeSmtpCommand(conn, 'EHLO localhost', [250])
    await writeSmtpCommand(conn, 'AUTH LOGIN', [334])
    await writeSmtpCommand(conn, toBase64(username), [334])
    await writeSmtpCommand(conn, toBase64(password), [235])
    await writeSmtpCommand(conn, `MAIL FROM:<${username}>`, [250])
    await writeSmtpCommand(conn, `RCPT TO:<${to}>`, [250, 251])
    await writeSmtpCommand(conn, 'DATA', [354])

    const encodedSubject = toMimeHeader(subject)
    const encodedFromName = toMimeHeader('RICH系統')
    const encodedHtml = wrapBase64(toBase64(html))
    const messageIdDomain = username.split('@')[1] || 'localhost'
    const mimeMessage = [
      `From: ${encodedFromName} <${username}>`,
      `To: <${to}>`,
      `Subject: ${encodedSubject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@${messageIdDomain}>`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodedHtml,
      '.',
    ].join('\r\n')

    await conn.write(textEncoder.encode(`${mimeMessage}\r\n`))

    const deliveryResponse = await readSmtpResponse(conn)
    if (deliveryResponse.code !== 250) {
      throw new Error(`SMTP delivery failed: ${deliveryResponse.message}`)
    }

    await writeSmtpCommand(conn, 'QUIT', [221])
  } finally {
    conn.close()
  }
}

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

    // Always use the preview URL to avoid Lovable auth-bridge redirects
    const baseUrl = 'https://id-preview--8b8c1b89-a942-4abc-ad82-e429efb965cb.lovable.app'
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

    await sendViaGmailSmtp({
      username: GMAIL_USER,
      password: GMAIL_APP_PASSWORD,
      to: email,
      subject: '重設您的 RICH 系統密碼',
      html: emailHtml,
    })

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
