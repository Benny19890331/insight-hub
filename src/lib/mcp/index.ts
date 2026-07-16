import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listContacts from "./tools/list_contacts";
import getContact from "./tools/get_contact";
import listInteractions from "./tools/list_interactions";
import createInteraction from "./tools/create_interaction";

// The OAuth issuer must be the direct Supabase host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "rich-list-mcp",
  title: "RICH 系統名單管理",
  version: "0.1.0",
  instructions:
    "存取 RICH 系統中該使用者的聯絡人與互動紀錄。可用 list_contacts / get_contact 查詢，用 list_interactions 追蹤最近互動，用 create_interaction 補記。所有操作皆在該使用者的資料範圍內執行（受 RLS 保護）。",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listContacts, getContact, listInteractions, createInteraction],
});
