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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const body = await req.json();
    const { action } = body;

    if (action === "list_users") {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;

      const { data: bannedData } = await adminClient.from("banned_users").select("user_id");
      const bannedSet = new Set((bannedData ?? []).map((b: any) => b.user_id));

      const { data: profiles } = await adminClient.from("profiles").select("id, display_name");
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));

      const { data: adminRoles } = await adminClient.from("user_roles").select("user_id").eq("role", "admin");
      const adminSet = new Set((adminRoles ?? []).map((r: any) => r.user_id));

      const result = users
        .filter((u: any) => u.id !== user.id)
        .map((u: any) => ({
          id: u.id,
          email: u.email,
          displayName: profileMap.get(u.id) || "",
          createdAt: u.created_at,
          lastSignIn: u.last_sign_in_at,
          isBanned: bannedSet.has(u.id),
          isAdmin: adminSet.has(u.id),
        }));

      return new Response(JSON.stringify({ users: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_ban") {
      const { targetUserId, ban } = body;
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "Missing targetUserId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (ban) {
        await adminClient.from("banned_users").upsert({
          user_id: targetUserId,
          banned_by: user.id,
        }, { onConflict: "user_id" });
        await adminClient.auth.admin.updateUserById(targetUserId, {
          ban_duration: "876000h",
        });
      } else {
        await adminClient.from("banned_users").delete().eq("user_id", targetUserId);
        await adminClient.auth.admin.updateUserById(targetUserId, {
          ban_duration: "none",
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_admin") {
      const { targetUserId, grant } = body;
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "Missing targetUserId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (grant) {
        await adminClient.from("user_roles").upsert({
          user_id: targetUserId,
          role: "admin",
        }, { onConflict: "user_id,role" });
      } else {
        await adminClient.from("user_roles").delete()
          .eq("user_id", targetUserId)
          .eq("role", "admin");
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { targetUserId, newPassword } = body;
      if (!targetUserId || !newPassword || newPassword.length < 6) {
        return new Response(JSON.stringify({ error: "密碼至少需要 6 個字元" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: resetError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      });
      if (resetError) throw resetError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
