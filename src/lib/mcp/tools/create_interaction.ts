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
  name: "create_interaction",
  title: "新增互動紀錄",
  description: "為指定聯絡人新增一筆互動紀錄。",
  inputSchema: {
    contact_id: z.string().uuid().describe("聯絡人 UUID"),
    summary: z.string().trim().min(1).describe("互動內容摘要"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("互動日期 YYYY-MM-DD，預設今日"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ contact_id, summary, date }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "未登入" }], isError: true };
    const sb = client(ctx);
    const payload: Record<string, unknown> = {
      contact_id,
      summary,
      user_id: ctx.getUserId(),
    };
    if (date) payload.date = date;
    const { data, error } = await sb.from("interactions").insert(payload).select().maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { interaction: data },
    };
  },
});
