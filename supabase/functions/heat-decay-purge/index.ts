// Scheduled job: 回收筒 30 天到期自動清理
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const d30 = new Date(Date.now() - 30 * 86400000).toISOString();

  try {
    const { data: purged, error } = await supabase
      .from("contacts")
      .delete()
      .not("deleted_at", "is", null)
      .lt("deleted_at", d30)
      .select("id");
    if (error) throw error;

    const result = { ok: true, purged: purged?.length ?? 0, ranAt: new Date().toISOString() };
    console.log("[heat-decay-purge]", result);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[heat-decay-purge] error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
