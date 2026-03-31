import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const config = { api: { bodyParser: true } };

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { email, app_url } = req.body || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Please provide Email" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      console.error("Missing environment variables");
      return res.status(500).json({ error: "Server config error" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userList, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      console.error("listUsers error:", listErr.message);
      return res.status(200).json({ success: true });
    }

    const user = userList.users.find(
      (u: any) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    if (!user) {
      return res.status(200).json({ success: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("user_id", user.id)
      .eq("used", false);

    const { error: insertErr } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

    if (insertErr) {
      console.error("Insert token error:", insertErr.message);
      return res.status(500).json({ error: "System error" });
    }

    const baseUrl = (app_url || "https://insight-hub-gules.vercel.app").replace(/\/$/, "");
    const resetLink = baseUrl + "/auth?reset_token=" + token;

    const emailHtml = [
      '<div style="font-family:sans-serif;max-width:480px;margin:0 auto">',
      '<h2 style="color:#1e293b">Reset Password</h2>',
      '<p>Click the button below to set a new password:</p>',
      '<p style="text-align:center;margin:24px 0">',
      '<a href="' + resetLink + '" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset Password</a>',
      '</p>',
      '<p style="font-size:13px;color:#64748b">If the button does not work, copy this link:</p>',
      '<p style="word-break:break-all;font-size:12px;color:#2563eb">' + resetLink + '</p>',
      '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>',
      '<p style="color:#94a3b8;font-size:12px">If you did not request this, ignore this email. Link expires in 1 hour.</p>',
      '</div>'
    ].join("");

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + resendApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RICH System <onboarding@resend.dev>",
        to: [email.trim()],
        subject: "Reset your password - RICH System",
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend API error:", errBody);
      return res.status(500).json({ error: "Failed to send email" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "System error" });
  }
}
