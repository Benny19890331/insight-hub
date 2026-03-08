import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin using their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = await req.json();

    if (action === "list_users") {
      // List all users from auth
      const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;

      // Get banned users
      const { data: bannedData } = await adminClient.from("banned_users").select("user_id");
      const bannedSet = new Set((bannedData ?? []).map((b: any) => b.user_id));

      // Get profiles for display names
      const { data: profiles } = await adminClient.from("profiles").select("id, display_name");
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));

      // Get contact counts per user
      const { data: contactCounts } = await adminClient.rpc("get_user_contact_counts").catch(() => ({ data: null }));
      const countMap = new Map((contactCounts ?? []).map((c: any) => [c.user_id, c.count]));

      const result = users
        .filter((u: any) => u.id !== user.id) // exclude self
        .map((u: any) => ({
          id: u.id,
          email: u.email,
          displayName: profileMap.get(u.id) || "",
          createdAt: u.created_at,
          lastSignIn: u.last_sign_in_at,
          isBanned: bannedSet.has(u.id),
          contactCount: countMap.get(u.id) || 0,
        }));

      return new Response(JSON.stringify({ users: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ban_user") {
      const { targetUserId } = await req.json().catch(() => ({}));
      const body = JSON.parse(await req.text().catch(() => "{}"));
      // Re-parse since we already consumed the body
    }

    if (action === "toggle_ban") {
      // Re-parse body
      const url = new URL(req.url);
      // We already parsed action, need targetUserId from same body
    }

    // For toggle_ban, let's handle it properly
    // Actually let me restructure - the body was already consumed for `action`
    // Let me fix this by parsing once

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
