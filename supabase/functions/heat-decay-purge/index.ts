// Scheduled job: 熱度自動衰減 + 回收筒 30 天到期清理
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const day = 86400000;
  const d30 = new Date(now - 30 * day).toISOString();
  const d60 = new Date(now - 60 * day).toISOString();

  try {
    // 1) hot → warm（>30 天未聯絡）
    const { data: hotDemoted, error: e1 } = await supabase
      .from("contacts")
      .update({ heat: "warm" })
      .eq("heat", "hot")
      .lt("last_contact_date", d30)
      .is("deleted_at", null)
      .select("id");
    if (e1) throw e1;

    // 2) warm → cold（>60 天未聯絡）
    const { data: warmDemoted, error: e2 } = await supabase
      .from("contacts")
      .update({ heat: "cold" })
      .eq("heat", "warm")
      .lt("last_contact_date", d60)
      .is("deleted_at", null)
      .select("id");
    if (e2) throw e2;

    // 3) 回收筒超過 30 天 → 永久刪除
    const { data: purged, error: e3 } = await supabase
      .from("contacts")
      .delete()
      .not("deleted_at", "is", null)
      .lt("deleted_at", d30)
      .select("id");
    if (e3) throw e3;

    const result = {
      ok: true,
      hotToWarm: hotDemoted?.length ?? 0,
      warmToCold: warmDemoted?.length ?? 0,
      purged: purged?.length ?? 0,
      ranAt: new Date().toISOString(),
    };
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
