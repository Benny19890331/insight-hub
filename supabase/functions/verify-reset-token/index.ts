import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { token, new_password } = await req.json()

    if (!token || !new_password) {
      return new Response(JSON.stringify({ error: '缺少必要參數' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (new_password.length < 6) {
      return new Response(JSON.stringify({ error: '密碼至少需要 6 個字元' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Hash the token
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    const { data: tokenRow, error: lookupErr } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('used', false)
      .single()

    if (lookupErr || !tokenRow) {
      return new Response(JSON.stringify({ error: '重設連結無效或已過期' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      await supabase.from('password_reset_tokens').update({ used: true }).eq('id', tokenRow.id)
      return new Response(JSON.stringify({ error: '重設連結已過期，請重新申請' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      tokenRow.user_id,
      { password: new_password }
    )

    if (updateErr) {
      console.error('updateUserById error:', updateErr.message)
      return new Response(JSON.stringify({ error: '更新密碼失敗：' + updateErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Mark all tokens for this user as used
    await supabase.from('password_reset_tokens').update({ used: true }).eq('user_id', tokenRow.user_id).eq('used', false)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('verify-reset-token error:', err)
    return new Response(JSON.stringify({ error: '系統錯誤，請稍後再試' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
