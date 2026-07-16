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
  name: "list_contacts",
  title: "列出聯絡人",
  description: "列出目前登入使用者在 RICH 系統中的聯絡人（可用 heat 或關鍵字過濾，預設回傳最近更新的 50 筆）。",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("回傳筆數上限（預設 50，最多 200）"),
    heat: z.enum(["cold", "warm", "hot", "loyal"]).optional().describe("依熱度篩選"),
    search: z.string().trim().min(1).optional().describe("在姓名 / 綽號 / 會員編號模糊搜尋"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, heat, search }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "未登入" }], isError: true };
    const sb = client(ctx);
    let q = sb
      .from("contacts")
      .select("id,name,nickname,member_id,heat,region,last_contact_date,updated_at,product_tags,statuses")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    if (heat) q = q.eq("heat", heat);
    if (search) {
      const s = `%${search}%`;
      q = q.or(`name.ilike.${s},nickname.ilike.${s},member_id.ilike.${s}`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { contacts: data ?? [] },
    };
  },
});
