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
  name: "list_interactions",
  title: "列出互動紀錄",
  description: "列出登入使用者最近的互動紀錄（可指定 contact_id 或日期範圍）。",
  inputSchema: {
    contact_id: z.string().uuid().optional().describe("只列出這位聯絡人的互動"),
    since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("起始日期 YYYY-MM-DD"),
    limit: z.number().int().min(1).max(200).optional().describe("回傳筆數上限（預設 50）"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ contact_id, since, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "未登入" }], isError: true };
    const sb = client(ctx);
    let q = sb
      .from("interactions")
      .select("id,contact_id,date,summary,created_at")
      .order("date", { ascending: false })
      .limit(limit ?? 50);
    if (contact_id) q = q.eq("contact_id", contact_id);
    if (since) q = q.gte("date", since);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { interactions: data ?? [] },
    };
  },
});
