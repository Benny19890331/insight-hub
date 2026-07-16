import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Contact, Interaction, HeatLevel, BirthdayReminder, Gender } from "@/data/contacts";
import { toast } from "sonner";
import type { Database, Json } from "@/integrations/supabase/types";
import { fetchAllPages, type PageResult } from "@/lib/fetchAllPages";
import {
  normalizeContactName,
  normalizeMemberId,
  planContactMerges,
  type ContactMergeGroup,
} from "@/lib/contactDedup";
import { isMissingMergeRpc, parseContactMergeRpcResult } from "@/lib/contactMergeJob";

type DbContact = Database["public"]["Tables"]["contacts"]["Row"];
type DbContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];
type DbContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];
type DbInteraction = Database["public"]["Tables"]["interactions"]["Row"];
type DbInsight = Database["public"]["Tables"]["contact_insights"]["Row"];
type DbInsightInsert = Database["public"]["Tables"]["contact_insights"]["Insert"];
type DbRelationship = Database["public"]["Tables"]["contact_relationships"]["Row"];
type DbRelationshipInsert = Database["public"]["Tables"]["contact_relationships"]["Insert"];

interface DbInsightTags {
  contact_id: string;
  tags: string[] | null;
}

function dbToContact(db: DbContact, interactionMap: Map<string, DbInteraction[]>, insightTagsMap: Map<string, string[]>): Contact {
  const interactions = interactionMap.get(db.id) ?? [];
  return {
    id: db.id,
    name: db.name,
    nickname: db.nickname ?? undefined,
    memberId: db.member_id ?? undefined,
    region: db.region,
    background: db.background,
    interest: db.interest ?? undefined,
    statuses: db.statuses ?? [],
    heat: (db.heat as HeatLevel) ?? "cold",
    notes: db.notes,
    taboos: db.taboos ?? "",
    lastContactDate: db.last_contact_date,
    nextFollowUpDate: db.next_follow_up_date ?? undefined,
    nextFollowUpNote: db.next_follow_up_note ?? undefined,
    nextFollowUpTime: db.next_follow_up_time ?? undefined,
    contactMethod: db.contact_method ?? undefined,
    avatarUrl: db.avatar_url ?? undefined,
    avatarThumbUrl: db.avatar_thumb_url ?? undefined,
    referrerId: db.referrer_id ?? undefined,
    referrerName: db.referrer_name ?? undefined,
    birthday: db.birthday ?? undefined,
    birthdayReminder: (db.birthday_reminder as BirthdayReminder) ?? "none",
    gender: (db.gender as Gender) ?? "",
    interactions: interactions.map((i) => ({ id: i.id, date: i.date, summary: i.summary })),
    productTags: db.product_tags ?? [],
    insightTags: insightTagsMap.get(db.id) ?? [],
    updatedAt: db.updated_at ?? undefined,
  };
}

function buildInteractionMap(interactions: DbInteraction[]): Map<string, DbInteraction[]> {
  const interactionMap = new Map<string, DbInteraction[]>();
  for (const interaction of interactions) {
    const existing = interactionMap.get(interaction.contact_id) ?? [];
    existing.push(interaction);
    interactionMap.set(interaction.contact_id, existing);
  }
  return interactionMap;
}

function buildInsightTagsMap(insights: DbInsightTags[]): Map<string, string[]> {
  const insightTagsMap = new Map<string, string[]>();
  for (const insight of insights) {
    insightTagsMap.set(insight.contact_id, insight.tags ?? []);
  }
  return insightTagsMap;
}

function contactToDbPayload(c: Contact): DbContactUpdate {
  return {
    name: c.name,
    nickname: c.nickname || null,
    member_id: c.memberId || null,
    region: c.region,
    background: c.background,
    interest: c.interest ?? "",
    statuses: c.statuses,
    heat: c.heat,
    notes: c.notes,
    taboos: c.taboos ?? "",
    last_contact_date: c.lastContactDate,
    next_follow_up_date: c.nextFollowUpDate || null,
    next_follow_up_note: c.nextFollowUpNote || null,
    next_follow_up_time: c.nextFollowUpTime || null,
    contact_method: c.contactMethod || null,
    avatar_url: c.avatarUrl || null,
    avatar_thumb_url: c.avatarThumbUrl || null,
    referrer_id: c.referrerId || null,
    referrer_name: c.referrerName || null,
    birthday: c.birthday || null,
    birthday_reminder: c.birthdayReminder || "none",
    gender: c.gender || null,
    product_tags: c.productTags,
  };
}

const MAX_CONTACTS = 20_000;
const MAX_INTERACTIONS = 100_000;
const MAX_MERGE_CONTACTS = 100_000;
const PARALLEL_BATCH = 5;
const UPSERT_BATCH = 200;

const toPageResult = <T,>(
  data: T[] | null,
  error: { message?: string } | null,
): PageResult<T> => ({ data, error });

function chunksOf<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function mergeUniqueStrings(values: Array<string | null | undefined>): string {
  const lines = values
    .flatMap((value) => (value ?? "").split("\n"))
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(lines)).join("\n");
}

function mergeStringArrays(values: Array<string[] | null | undefined>): string[] {
  return Array.from(new Set(values.flatMap((value) => value ?? []).filter(Boolean)));
}

function latestNonEmpty<T>(rows: DbContact[], read: (row: DbContact) => T | null | undefined): T | null {
  const sorted = [...rows].sort((a, b) =>
    new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime()
  );
  for (const row of sorted) {
    const value = read(row);
    if (typeof value === "string" ? value.trim().length > 0 : value != null) return value as T;
  }
  return null;
}

function mergeJsonArrays(values: Json[]): Json {
  const seen = new Set<string>();
  const merged: Json[] = [];
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      const key = JSON.stringify(item);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

const heatRank: Record<HeatLevel, number> = { cold: 0, warm: 1, hot: 2, loyal: 3 };

function consolidateImportedContact(current: Contact, incoming: Contact): Contact {
  const latestHeat = heatRank[incoming.heat] >= heatRank[current.heat] ? incoming.heat : current.heat;
  return {
    ...current,
    ...incoming,
    id: current.id,
    name: incoming.name.trim() || current.name,
    nickname: incoming.nickname || current.nickname,
    memberId: incoming.memberId || current.memberId,
    region: incoming.region || current.region,
    background: incoming.background || current.background,
    interest: incoming.interest || current.interest,
    statuses: mergeStringArrays([current.statuses, incoming.statuses]),
    heat: latestHeat,
    notes: mergeUniqueStrings([current.notes, incoming.notes]),
    taboos: mergeUniqueStrings([current.taboos, incoming.taboos]) || undefined,
    lastContactDate: [current.lastContactDate, incoming.lastContactDate].filter(Boolean).sort().at(-1) || current.lastContactDate,
    nextFollowUpDate: incoming.nextFollowUpDate || current.nextFollowUpDate,
    nextFollowUpNote: incoming.nextFollowUpNote || current.nextFollowUpNote,
    nextFollowUpTime: incoming.nextFollowUpTime || current.nextFollowUpTime,
    interactions: [...(current.interactions ?? []), ...(incoming.interactions ?? [])],
    productTags: mergeStringArrays([current.productTags, incoming.productTags]),
    contactMethod: incoming.contactMethod || current.contactMethod,
    avatarUrl: incoming.avatarUrl || current.avatarUrl,
    avatarThumbUrl: incoming.avatarThumbUrl || current.avatarThumbUrl,
    referrerId: incoming.referrerId || current.referrerId,
    referrerName: incoming.referrerName || current.referrerName,
    birthday: incoming.birthday || current.birthday,
    birthdayReminder: incoming.birthdayReminder || current.birthdayReminder,
    insightTags: mergeStringArrays([current.insightTags, incoming.insightTags]),
  };
}

type AvatarFields = Pick<DbContact, "id" | "avatar_url" | "avatar_thumb_url">;

function buildMergedContactUpdate(
  group: ContactMergeGroup<DbContact>,
  avatars: Map<string, AvatarFields>,
): DbContactUpdate {
  const rows = group.all;
  const primary = group.primary;
  const followUpRows = rows
    .filter((row) => row.next_follow_up_date)
    .sort((a, b) => (a.next_follow_up_date ?? "").localeCompare(b.next_follow_up_date ?? ""));
  const followUp = followUpRows[0] ?? null;
  const bestHeat = rows.reduce<HeatLevel>((best, row) => {
    const current = (row.heat in heatRank ? row.heat : "cold") as HeatLevel;
    return heatRank[current] > heatRank[best] ? current : best;
  }, "cold");

  const avatarRows = [...rows].sort((a, b) =>
    new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime()
  );
  const primaryAvatar = avatars.get(primary.id);
  const avatarUrl = primaryAvatar?.avatar_url
    || avatarRows.map((row) => avatars.get(row.id)?.avatar_url).find(Boolean)
    || null;
  const avatarThumbUrl = primaryAvatar?.avatar_thumb_url
    || avatarRows.map((row) => avatars.get(row.id)?.avatar_thumb_url).find(Boolean)
    || null;

  const memberIds = group.kind === "member"
    ? Array.from(new Set(rows.map((row) => row.member_id).filter((value): value is string => Boolean(value))))
    : [];
  const rightsNote = memberIds.length > 1 ? `[多經營權: ${memberIds.join(", ")}]` : "";

  return {
    name: primary.name,
    nickname: latestNonEmpty(rows, (row) => row.nickname),
    member_id: primary.member_id,
    region: latestNonEmpty(rows, (row) => row.region) ?? "",
    background: mergeUniqueStrings(rows.map((row) => row.background)),
    interest: mergeUniqueStrings(rows.map((row) => row.interest)),
    statuses: mergeStringArrays(rows.map((row) => row.statuses)),
    heat: bestHeat,
    notes: mergeUniqueStrings([...rows.map((row) => row.notes), rightsNote]),
    taboos: mergeUniqueStrings(rows.map((row) => row.taboos)),
    last_contact_date: rows.map((row) => row.last_contact_date).filter(Boolean).sort().at(-1) ?? primary.last_contact_date,
    next_follow_up_date: followUp?.next_follow_up_date ?? null,
    next_follow_up_note: followUp?.next_follow_up_note ?? null,
    next_follow_up_time: followUp?.next_follow_up_time ?? null,
    contact_method: latestNonEmpty(rows, (row) => row.contact_method),
    avatar_url: avatarUrl,
    avatar_thumb_url: avatarThumbUrl,
    referrer_id: primary.referrer_id ?? latestNonEmpty(rows, (row) => row.referrer_id),
    referrer_name: primary.referrer_name ?? latestNonEmpty(rows, (row) => row.referrer_name),
    birthday: latestNonEmpty(rows, (row) => row.birthday),
    birthday_reminder: latestNonEmpty(rows, (row) => row.birthday_reminder) ?? "none",
    gender: latestNonEmpty(rows, (row) => row.gender),
    product_tags: mergeStringArrays(rows.map((row) => row.product_tags)),
    deleted_at: null,
  };
}

/** Run an array of async tasks with concurrency limit */
async function runParallel<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

export function useContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchVersionRef = useRef(0);
  const hydrationPromiseRef = useRef<Promise<void> | null>(null);
  const hydratedUserIdRef = useRef<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!user) {
      fetchVersionRef.current += 1;
      hydrationPromiseRef.current = null;
      hydratedUserIdRef.current = null;
      setContacts([]);
      setLoading(false);
      return;
    }

    const fetchVersion = ++fetchVersionRef.current;
    setLoading(true);
    // 注意：刻意不抓 avatar_url（base64 大頭像會把 payload 炸到數 MB），詳情頁再 lazy load
    // 注意：avatar_url（原圖）不抓，僅抓 avatar_thumb_url（~3KB 縮圖）
    const CONTACT_COLS = "id,user_id,name,nickname,member_id,region,background,interest,statuses,heat,notes,taboos,last_contact_date,next_follow_up_date,next_follow_up_note,next_follow_up_time,contact_method,avatar_thumb_url,referrer_id,referrer_name,birthday,birthday_reminder,gender,product_tags,created_at,updated_at";

    try {
      const allContacts = await fetchAllPages<DbContact>(
        (from, to) => supabase
          .from("contacts")
          .select(CONTACT_COLS)
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to)
          .then(({ data, error }) => toPageResult(data as unknown as DbContact[] | null, error)),
        { maxRows: MAX_CONTACTS, label: "聯絡人" },
      );

      if (fetchVersion !== fetchVersionRef.current) return;

      // 保留先前已 hydrate 的 interactions / insightTags，避免重抓 contacts 時畫面瞬間清空
      setContacts((prev) => {
        const prevById = new Map(prev.map((c) => [c.id, c]));
        return allContacts.map((c) => {
          const fresh = dbToContact(c, new Map(), new Map());
          const old = prevById.get(c.id);
          if (old) {
            fresh.interactions = old.interactions ?? [];
            fresh.insightTags = old.insightTags ?? [];
          }
          return fresh;
        });
      });
      setLoading(false);
    } catch (err) {
      console.error("fetchContacts failed:", err);
      toast.error("載入資料失敗");
      setLoading(false);
      return;
    }

    // 每次都重新同步 interactions / insights，僅用 hydrationPromiseRef 防止並發重複
    if (hydrationPromiseRef.current) {
      return;
    }

    const hydrationPromise = (async () => {
      const [interactionsResult, insightsResult] = await Promise.allSettled([
        fetchAllPages<DbInteraction>(
          (from, to) => supabase
            .from("interactions")
            .select("id,contact_id,user_id,date,summary,created_at")
            .eq("user_id", user.id)
            .order("date", { ascending: false })
            .order("id", { ascending: false })
            .range(from, to)
            .then(({ data, error }) => toPageResult(data as DbInteraction[] | null, error)),
          { maxRows: MAX_INTERACTIONS, label: "互動紀錄" },
        ),
        fetchAllPages<DbInsightTags>(
          (from, to) => supabase
            .from("contact_insights")
            .select("contact_id,tags")
            .eq("user_id", user.id)
            .order("contact_id", { ascending: true })
            .range(from, to)
            .then(({ data, error }) => toPageResult(data as DbInsightTags[] | null, error)),
          { maxRows: MAX_CONTACTS, label: "AI 標籤" },
        ),
      ]);

      if (fetchVersion !== fetchVersionRef.current) return;

      if (interactionsResult.status === "rejected") {
        console.error("background interactions hydration failed:", interactionsResult.reason);
      }
      if (insightsResult.status === "rejected") {
        console.error("background insight hydration failed:", insightsResult.reason);
      }

      const interactionMap = interactionsResult.status === "fulfilled"
        ? buildInteractionMap(interactionsResult.value)
        : null;
      const insightTagsMap = insightsResult.status === "fulfilled"
        ? buildInsightTagsMap(insightsResult.value)
        : null;

      setContacts((prev) => prev.map((contact) => ({
        ...contact,
        interactions: interactionMap
          ? (interactionMap.get(contact.id) ?? []).map((item) => ({ id: item.id, date: item.date, summary: item.summary }))
          : contact.interactions,
        insightTags: insightTagsMap
          ? (insightTagsMap.get(contact.id) ?? [])
          : (contact.insightTags ?? []),
      })));

      if (interactionsResult.status === "fulfilled" && insightsResult.status === "fulfilled") {
        hydratedUserIdRef.current = user.id;
      }
    })();

    hydrationPromiseRef.current = hydrationPromise;
    void hydrationPromise.finally(() => {
      if (hydrationPromiseRef.current === hydrationPromise) {
        hydrationPromiseRef.current = null;
      }
    });
  }, [user]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const addContact = useCallback(async (contact: Contact) => {
    if (!user) return;
    const payload = contactToDbPayload(contact);
    const insertRow = { ...payload, id: contact.id, user_id: user.id };
    const { error } = await supabase.from("contacts").insert(insertRow as never);
    if (error) { toast.error("新增失敗"); return; }
    if (contact.interactions?.length) {
      await supabase.from("interactions").insert(
        contact.interactions.map((i) => ({
          contact_id: contact.id, user_id: user.id, date: i.date, summary: i.summary,
        }))
      );
    }
    setContacts(prev => [{ ...contact, updatedAt: new Date().toISOString() }, ...prev]);
  }, [user]);

  const updateContact = useCallback(async (contact: Contact) => {
    if (!user) return;
    const { error } = await supabase.from("contacts").update(contactToDbPayload(contact))
      .eq("id", contact.id).eq("user_id", user.id);
    if (error) { toast.error("更新失敗"); return; }
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...contact, updatedAt: new Date().toISOString() } : c));
  }, [user]);

  const deleteContact = useCallback(async (id: string) => {
    if (!user) return;
    // Soft delete: mark deleted_at instead of hard delete (30-day recovery window)
    const { error } = await supabase.from("contacts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", user.id);
    if (error) { toast.error("刪除失敗"); return; }
    toast.success("已移至回收筒（30 天內可還原）");
    setContacts(prev => prev.filter(c => c.id !== id));
  }, [user]);

  const fetchTrash = useCallback(async (): Promise<Contact[]> => {
    if (!user) return [];
    const { data, error } = await supabase.from("contacts")
      .select("*").eq("user_id", user.id).not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (error) { toast.error("讀取回收筒失敗"); return []; }
    return (data ?? []).map((contact) => dbToContact(contact, new Map(), new Map()));
  }, [user]);

  const restoreContact = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("contacts")
      .update({ deleted_at: null })
      .eq("id", id).eq("user_id", user.id);
    if (error) { toast.error("還原失敗"); return; }
    toast.success("已還原");
    await fetchContacts();
  }, [user, fetchContacts]);

  const permanentlyDeleteContact = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("contacts").delete().eq("id", id).eq("user_id", user.id);
    if (error) { toast.error("永久刪除失敗"); return; }
    toast.success("已永久刪除");
  }, [user]);

  const emptyTrash = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from("contacts").delete()
      .eq("user_id", user.id).not("deleted_at", "is", null);
    if (error) { toast.error("清空失敗"); return; }
    toast.success("回收筒已清空");
  }, [user]);


  // Recompute contact.last_contact_date from its interactions and bump updated_at
  const syncContactAfterInteractionChange = useCallback(async (contactId: string) => {
    if (!user) return;
    const { data } = await supabase.from("interactions")
      .select("date").eq("contact_id", contactId).eq("user_id", user.id)
      .order("date", { ascending: false }).limit(1);
    const latest = data && data.length > 0 ? data[0].date : new Date().toISOString().slice(0, 10);
    await supabase.from("contacts")
      .update({ last_contact_date: latest, updated_at: new Date().toISOString() })
      .eq("id", contactId).eq("user_id", user.id);
  }, [user]);

  const addInteraction = useCallback(async (contactId: string, interaction: Interaction) => {
    if (!user) return;
    const { data, error } = await supabase.from("interactions").insert({
      contact_id: contactId, user_id: user.id,
      date: interaction.date, summary: interaction.summary,
    }).select("id").single();
    if (error) { toast.error("新增互動失敗"); return; }
    const newInteraction: Interaction = { ...interaction, id: data?.id };
    const now = new Date().toISOString();
    setContacts(prev => prev.map(c => {
      if (c.id !== contactId) return c;
      const updated = [newInteraction, ...c.interactions];
      const newLastDate = updated.reduce((m, i) => i.date > m ? i.date : m, updated[0]?.date ?? c.lastContactDate);
      return { ...c, interactions: updated, lastContactDate: newLastDate, updatedAt: now };
    }));
    syncContactAfterInteractionChange(contactId);
  }, [user, syncContactAfterInteractionChange]);

  const updateInteraction = useCallback(async (contactId: string, interaction: Interaction) => {
    if (!user || !interaction.id) return;
    const { error } = await supabase.from("interactions").update({
      date: interaction.date, summary: interaction.summary,
    }).eq("id", interaction.id).eq("user_id", user.id);
    if (error) { toast.error("更新互動失敗"); return; }
    const now = new Date().toISOString();
    setContacts(prev => prev.map(c => {
      if (c.id !== contactId) return c;
      const updated = c.interactions.map(i => i.id === interaction.id ? interaction : i);
      const newLastDate = updated.reduce((m, i) => i.date > m ? i.date : m, updated[0]?.date ?? c.lastContactDate);
      return { ...c, interactions: updated, lastContactDate: newLastDate, updatedAt: now };
    }));
    syncContactAfterInteractionChange(contactId);
  }, [user, syncContactAfterInteractionChange]);

  const deleteInteraction = useCallback(async (contactId: string, interaction: Interaction) => {
    if (!user) return;
    if (interaction.id) {
      await supabase.from("interactions").delete().eq("id", interaction.id).eq("user_id", user.id);
    } else {
      const { data } = await supabase.from("interactions")
        .select("id").eq("contact_id", contactId).eq("user_id", user.id)
        .eq("date", interaction.date).eq("summary", interaction.summary).limit(1);
      if (data && data.length > 0) {
        await supabase.from("interactions").delete().eq("id", data[0].id);
      }
    }
    const now = new Date().toISOString();
    setContacts(prev => prev.map(c => {
      if (c.id !== contactId) return c;
      const updated = c.interactions.filter(i =>
        interaction.id ? i.id !== interaction.id : !(i.date === interaction.date && i.summary === interaction.summary)
      );
      const newLastDate = updated.length ? updated.reduce((m, i) => i.date > m ? i.date : m, updated[0].date) : c.lastContactDate;
      return { ...c, interactions: updated, lastContactDate: newLastDate, updatedAt: now };
    }));
    syncContactAfterInteractionChange(contactId);
  }, [user, syncContactAfterInteractionChange]);


  const importContacts = useCallback(async (imported: Contact[]) => {
    if (!user) throw new Error("登入狀態已失效，請重新登入後再匯入");

    // A single Supabase select commonly returns at most 1,000 rows. Fetch all
    // existing contacts so a 4,000+ row account does not create false duplicates.
    const existing = await fetchAllPages<{ id: string; member_id: string | null; name: string }>(
      (from, to) => supabase
        .from("contacts")
        .select("id,member_id,name")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
        .then(({ data, error }) => toPageResult(data, error)),
      { maxRows: MAX_MERGE_CONTACTS, label: "既有名單" },
    );

    const existingByMemberId = new Map<string, string>();
    const existingByName = new Map<string, string>();
    const duplicateNames = new Set<string>();
    for (const row of existing) {
      const memberId = normalizeMemberId(row.member_id);
      const name = normalizeContactName(row.name);
      if (memberId) existingByMemberId.set(memberId, row.id);
      if (existingByName.has(name)) {
        duplicateNames.add(name);
      } else {
        existingByName.set(name, row.id);
      }
    }

    // Consolidate duplicates inside the same file before sending any request.
    // The old implementation queued insert and update concurrently, allowing an
    // update to race ahead of the row it depended on.
    const importedByKey = new Map<string, Contact>();
    for (const contact of imported) {
      const memberId = normalizeMemberId(contact.memberId);
      const name = normalizeContactName(contact.name);
      const key = memberId ? `member:${memberId}` : `name:${name}`;
      const current = importedByKey.get(key);
      importedByKey.set(key, current ? consolidateImportedContact(current, contact) : contact);
    }

    let merged = 0;
    let added = 0;
    const rows: DbContactInsert[] = [];

    for (const contact of importedByKey.values()) {
      const memberId = normalizeMemberId(contact.memberId);
      const name = normalizeContactName(contact.name);
      const memberMatch = memberId ? existingByMemberId.get(memberId) : null;
      // Only match by name if the name is unique in existing contacts
      const nameMatch = (!memberMatch && !duplicateNames.has(name)) ? (existingByName.get(name) || null) : null;
      const matchId = memberMatch || nameMatch;

      const row: DbContactInsert = {
        id: matchId || contact.id,
        user_id: user.id,
        name: contact.name.trim(),
        nickname: contact.nickname || null,
        member_id: contact.memberId || null,
        region: contact.region,
        background: contact.background,
        interest: contact.interest ?? "",
        statuses: contact.statuses,
        heat: contact.heat,
        notes: contact.notes,
        taboos: contact.taboos ?? "",
        last_contact_date: contact.lastContactDate,
        next_follow_up_date: contact.nextFollowUpDate || null,
        next_follow_up_note: contact.nextFollowUpNote || null,
        next_follow_up_time: contact.nextFollowUpTime || null,
        contact_method: contact.contactMethod || null,
        birthday: contact.birthday || null,
        birthday_reminder: contact.birthdayReminder || "none",
        gender: contact.gender || null,
        product_tags: contact.productTags,
      };

      if (matchId) {
        merged++;
      } else {
        added++;
      }
      rows.push(row);
    }

    // A few bulk upserts are substantially more reliable than 4,000 individual
    // requests. Every response is checked before the UI reports success.
    let completed = 0;
    for (const batch of chunksOf(rows, UPSERT_BATCH)) {
      const { error } = await supabase
        .from("contacts")
        .upsert(batch, { onConflict: "id" });
      if (error) {
        throw new Error(`匯入在第 ${completed + 1}～${completed + batch.length} 筆失敗：${error.message}`);
      }
      completed += batch.length;
    }

    await fetchContacts();
    return {
      added,
      merged,
      consolidated: imported.length - importedByKey.size,
    };
  }, [user, fetchContacts]);

  // Browser implementation retained as a deployment-order fallback. Once the
  // database migration is installed, the public action below always uses the
  // transactional RPC instead.
  const deduplicateContactsInBrowser = useCallback(async () => {
    if (!user) throw new Error("登入狀態已失效，請重新登入後再合併");

    // Keep the first scan lightweight: avatar base64 fields can otherwise turn
    // a 4,000-row merge into a multi-megabyte response.
    const DEDUPE_COLS = "id,user_id,name,nickname,member_id,region,background,interest,statuses,heat,notes,taboos,last_contact_date,next_follow_up_date,next_follow_up_note,next_follow_up_time,contact_method,referrer_id,referrer_name,birthday,birthday_reminder,gender,product_tags,created_at,updated_at,deleted_at";
    const allContacts = await fetchAllPages<DbContact>(
      (from, to) => supabase
        .from("contacts")
        .select(DEDUPE_COLS)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
        .then(({ data, error }) => toPageResult(
          (data ?? []).map((row) => ({ ...row, avatar_url: null, avatar_thumb_url: null })) as DbContact[],
          error,
        )),
      { maxRows: MAX_MERGE_CONTACTS, label: "待合併名單" },
    );

    const groups = planContactMerges(allContacts);
    if (groups.length === 0) return { merged: 0, groups: 0 };

    const idsToDelete = groups.flatMap((group) => group.duplicates.map((row) => row.id));
    const duplicateToPrimary = new Map<string, string>();
    for (const group of groups) {
      for (const duplicate of group.duplicates) duplicateToPrimary.set(duplicate.id, group.primary.id);
    }

    // Fetch large avatar fields only for rows that are actually being merged.
    const avatars = new Map<string, AvatarFields>();
    const mergeContactIds = groups.flatMap((group) => group.all.map((row) => row.id));
    for (const batch of chunksOf(mergeContactIds, 100)) {
      const { data, error } = await supabase
        .from("contacts")
        .select("id,avatar_url,avatar_thumb_url")
        .eq("user_id", user.id)
        .in("id", batch);
      if (error) throw new Error(`讀取重複名單照片失敗：${error.message}`);
      for (const row of data ?? []) avatars.set(row.id, row);
    }

    const [allInsights, allRelationships] = await Promise.all([
      fetchAllPages<DbInsight>(
        (from, to) => supabase
          .from("contact_insights")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to)
          .then(({ data, error }) => toPageResult(data, error)),
        { maxRows: MAX_MERGE_CONTACTS, label: "AI 分析資料" },
      ),
      fetchAllPages<DbRelationship>(
        (from, to) => supabase
          .from("contact_relationships")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to)
          .then(({ data, error }) => toPageResult(data, error)),
        { maxRows: MAX_MERGE_CONTACTS, label: "人物關係資料" },
      ),
    ]);

    const mergedUpdates = new Map<string, DbContactUpdate>();
    const mergeTasks = groups.map((group) => async () => {
      const payload = buildMergedContactUpdate(group, avatars);
      mergedUpdates.set(group.primary.id, payload);
      const { error } = await supabase
        .from("contacts")
        .update(payload)
        .eq("id", group.primary.id)
        .eq("user_id", user.id);
      if (error) throw new Error(`「${group.primary.name}」主資料合併失敗：${error.message}`);
    });
    await runParallel(mergeTasks, PARALLEL_BATCH);

    // Merge all AI analysis into the primary row before duplicate contacts are
    // deleted. Text lines and JSON scripts are de-duplicated, making retries safe.
    const insightsByContact = new Map<string, DbInsight>();
    for (const insight of allInsights) insightsByContact.set(insight.contact_id, insight);
    const mergedInsightRows: DbInsightInsert[] = [];
    for (const group of groups) {
      const insights = group.all
        .map((row) => insightsByContact.get(row.id))
        .filter((row): row is DbInsight => Boolean(row));
      if (insights.length === 0) continue;
      const newest = [...insights].sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      mergedInsightRows.push({
        contact_id: group.primary.id,
        user_id: user.id,
        summary: mergeUniqueStrings(insights.map((row) => row.summary)),
        tags: mergeStringArrays(insights.map((row) => row.tags)),
        next_action: newest.find((row) => row.next_action.trim())?.next_action ?? "",
        invite_scripts: mergeJsonArrays(insights.map((row) => row.invite_scripts)),
        updated_at: new Date().toISOString(),
      });
    }
    for (const batch of chunksOf(mergedInsightRows, 100)) {
      const { error } = await supabase
        .from("contact_insights")
        .upsert(batch, { onConflict: "contact_id" });
      if (error) throw new Error(`合併 AI 分析失敗：${error.message}`);
    }

    // Re-create relationship edges with canonical IDs before ON DELETE CASCADE
    // removes the old edges. Self-relations are intentionally discarded.
    const remappedRelationships = new Map<string, DbRelationshipInsert>();
    for (const relation of allRelationships) {
      const contactId = duplicateToPrimary.get(relation.contact_id) ?? relation.contact_id;
      const relatedContactId = duplicateToPrimary.get(relation.related_contact_id) ?? relation.related_contact_id;
      if (contactId === relation.contact_id && relatedContactId === relation.related_contact_id) continue;
      if (contactId === relatedContactId) continue;
      const key = `${contactId}:${relatedContactId}`;
      if (!remappedRelationships.has(key)) {
        remappedRelationships.set(key, {
          user_id: user.id,
          contact_id: contactId,
          related_contact_id: relatedContactId,
          relation_type: relation.relation_type,
          created_at: relation.created_at,
        });
      }
    }
    for (const batch of chunksOf(Array.from(remappedRelationships.values()), 100)) {
      const { error } = await supabase
        .from("contact_relationships")
        .upsert(batch, {
          onConflict: "user_id,contact_id,related_contact_id",
          ignoreDuplicates: true,
        });
      if (error) throw new Error(`轉移人物關係失敗：${error.message}`);
    }

    // Transfer every interaction in group-sized operations. This is idempotent:
    // if a retry is needed, already transferred rows simply no longer match.
    const interactionTasks = groups.flatMap((group) =>
      chunksOf(group.duplicates.map((row) => row.id), 100).map((batch) => async () => {
        const { error } = await supabase
          .from("interactions")
          .update({ contact_id: group.primary.id })
          .eq("user_id", user.id)
          .in("contact_id", batch);
        if (error) throw new Error(`「${group.primary.name}」互動紀錄轉移失敗：${error.message}`);
      })
    );
    await runParallel(interactionTasks, PARALLEL_BATCH);

    // Update every referral pointer that referenced a duplicate. If the primary
    // would point to itself after mapping, clear that invalid loop.
    const referrerTasks = groups.flatMap((group) => {
      const duplicateIds = group.duplicates.map((row) => row.id);
      const tasks = chunksOf(duplicateIds, 100).map((batch) => async () => {
        const { error } = await supabase
          .from("contacts")
          .update({ referrer_id: group.primary.id, referrer_name: group.primary.name })
          .eq("user_id", user.id)
          .in("referrer_id", batch)
          .neq("id", group.primary.id);
        if (error) throw new Error(`「${group.primary.name}」推薦關係轉移失敗：${error.message}`);
      });
      const selectedReferrer = mergedUpdates.get(group.primary.id)?.referrer_id;
      if (selectedReferrer === group.primary.id || duplicateIds.includes(String(selectedReferrer))) {
        tasks.push(async () => {
          const { error } = await supabase
            .from("contacts")
            .update({ referrer_id: null, referrer_name: null })
            .eq("id", group.primary.id)
            .eq("user_id", user.id);
          if (error) throw new Error(`「${group.primary.name}」循環推薦關係修正失敗：${error.message}`);
        });
      }
      return tasks;
    });
    await runParallel(referrerTasks, PARALLEL_BATCH);

    // Deletion is deliberately the final phase. If an earlier phase fails, all
    // original contacts remain and the operation can safely be retried.
    for (const batch of chunksOf(idsToDelete, 100)) {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("user_id", user.id)
        .in("id", batch);
      if (error) throw new Error(`刪除已轉移的重複名單失敗：${error.message}`);
    }

    await fetchContacts();
    return {
      merged: idsToDelete.length,
      groups: groups.length,
      mode: "browser_fallback" as const,
    };
  }, [user, fetchContacts]);

  const deduplicateContacts = useCallback(async () => {
    if (!user) throw new Error("登入狀態已失效，請重新登入後再合併");

    const { data: createData, error: createError } = await supabase
      .rpc("create_contact_merge_job");

    // This keeps the web app usable if code is deployed a few minutes before
    // the SQL migration. Other database errors must never be hidden.
    if (createError) {
      if (isMissingMergeRpc(createError)) {
        return deduplicateContactsInBrowser();
      }
      throw new Error(`建立安全合併工作失敗：${createError.message}`);
    }

    const created = parseContactMergeRpcResult(createData);
    if (created.status === "completed") {
      return {
        merged: 0,
        groups: 0,
        jobId: created.jobId,
        mode: "database_transaction" as const,
      };
    }

    const { data: runData, error: runError } = await supabase
      .rpc("run_contact_merge_job", { job_id: created.jobId });

    if (runError) {
      // The request may have completed in PostgreSQL even if the browser lost
      // the response. Read the durable job before telling the user it failed.
      const { data: savedJob } = await supabase
        .from("contact_merge_jobs")
        .select("status,result,error_message")
        .eq("id", created.jobId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (savedJob?.status === "completed") {
        const recovered = parseContactMergeRpcResult(savedJob.result);
        await fetchContacts();
        return {
          merged: recovered.merged,
          groups: recovered.groups,
          jobId: recovered.jobId,
          mode: "database_transaction" as const,
        };
      }

      if (savedJob?.status === "failed") {
        throw new Error(savedJob.error_message || `資料庫合併失敗：${runError.message}`);
      }

      throw new Error("合併工作已安全保留，但連線中斷；請稍後再按一次合併即可續跑");
    }

    const completed = parseContactMergeRpcResult(runData);
    if (completed.status === "failed") {
      throw new Error(completed.error || "資料庫已取消這次合併，原始名單沒有被刪除");
    }
    if (completed.status !== "completed") {
      throw new Error("合併工作尚未完成，請稍後再試");
    }

    await fetchContacts();
    return {
      merged: completed.merged,
      groups: completed.groups,
      jobId: completed.jobId,
      mode: "database_transaction" as const,
    };
  }, [user, fetchContacts, deduplicateContactsInBrowser]);

  return { contacts, loading, addContact, updateContact, deleteContact, addInteraction, updateInteraction, deleteInteraction, importContacts, deduplicateContacts, refetch: fetchContacts, fetchTrash, restoreContact, permanentlyDeleteContact, emptyTrash };
}
