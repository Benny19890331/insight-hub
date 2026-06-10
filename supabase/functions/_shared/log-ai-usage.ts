import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function logAiUsage(authHeader: string | null, functionName: string) {
  try {
    if (!authHeader) return;
    const sbUrl = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!sbUrl || !anon || !svc) return;
    const userClient = createClient(sbUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return;
    const svcClient = createClient(sbUrl, svc);
    await svcClient.from("ai_usage_logs").insert({
      user_id: user.id,
      function_name: functionName,
    });
  } catch (e) {
    console.error("logAiUsage error:", e);
  }
}
