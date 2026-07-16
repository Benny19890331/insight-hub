import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_contact",
  title: "取得聯絡人完整資訊",
  description: "取得指定聯絡人的所有欄位，含最近 10 筆互動紀錄與 AI 洞察。",
  inputSchema: {
    contact_id: z.string().uuid().describe("聯絡人 UUID"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ contact_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "未登入" }], isError: true };
    const sb = client(ctx);
    const [contactRes, interactionsRes, insightsRes] = await Promise.all([
      sb.from("contacts").select("*").eq("id", contact_id).is("deleted_at", null).maybeSingle(),
      sb.from("interactions").select("id,date,summary,created_at").eq("contact_id", contact_id).order("date", { ascending: false }).limit(10),
      sb.from("contact_insights").select("summary,tags,next_action,invite_scripts,updated_at").eq("contact_id", contact_id).maybeSingle(),
    ]);
    if (contactRes.error) return { content: [{ type: "text", text: contactRes.error.message }], isError: true };
    if (!contactRes.data) return { content: [{ type: "text", text: "查無此聯絡人" }], isError: true };
    const payload = {
      contact: contactRes.data,
      recent_interactions: interactionsRes.data ?? [],
      insight: insightsRes.data ?? null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
