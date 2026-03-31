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
    const { token, new_password } = req.body || {};

    if (!token || !new_password) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing environment variables");
      return res.status(500).json({ error: "Server config error" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const { data: tokenRow, error: lookupErr } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("used", false)
      .single();

    if (lookupErr || !tokenRow) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      await supabase
        .from("password_reset_tokens")
        .update({ used: true })
        .eq("id", tokenRow.id);
      return res.status(400).json({ error: "Reset link has expired" });
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      tokenRow.user_id,
      { password: new_password }
    );

    if (updateErr) {
      console.error("updateUserById error:", updateErr.message);
      return res.status(500).json({ error: "Failed to update password: " + updateErr.message });
    }

    await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("id", tokenRow.id);

    await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("user_id", tokenRow.user_id)
      .eq("used", false);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "System error" });
  }
}
