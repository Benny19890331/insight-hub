import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Contact, Interaction, HeatLevel, BirthdayReminder, Gender } from "@/data/contacts";
import { toast } from "sonner";

interface DbContact {
  id: string;
  user_id: string;
  name: string;
  nickname: string | null;
  member_id: string | null;
  region: string;
  background: string;
  statuses: string[];
  heat: string;
  notes: string;
  last_contact_date: string;
  next_follow_up_date: string | null;
  next_follow_up_note: string | null;
  next_follow_up_time: string | null;
  contact_method: string | null;
  avatar_url: string | null;
  referrer_id: string | null;
  referrer_name: string | null;
  birthday: string | null;
  birthday_reminder: string;
  gender: string | null;
  product_tags: string[];
  created_at: string;
}

interface DbInteraction {
  id: string;
  contact_id: string;
  user_id: string;
  date: string;
  summary: string;
}

function dbToContact(db: DbContact, interactionMap: Map<string, DbInteraction[]>): Contact {
  const interactions = interactionMap.get(db.id) ?? [];
  return {
    id: db.id,
    name: db.name,
    nickname: db.nickname ?? undefined,
    memberId: db.member_id ?? undefined,
    region: db.region,
    background: db.background,
    statuses: db.statuses ?? [],
    heat: (db.heat as HeatLevel) ?? "cold",
    notes: db.notes,
    lastContactDate: db.last_contact_date,
    nextFollowUpDate: db.next_follow_up_date ?? undefined,
    nextFollowUpNote: db.next_follow_up_note ?? undefined,
    nextFollowUpTime: db.next_follow_up_time ?? undefined,
    contactMethod: db.contact_method ?? undefined,
    avatarUrl: db.avatar_url ?? undefined,
    referrerId: db.referrer_id ?? undefined,
    referrerName: db.referrer_name ?? undefined,
    birthday: db.birthday ?? undefined,
    birthdayReminder: (db.birthday_reminder as BirthdayReminder) ?? "none",
    gender: (db.gender as Gender) ?? "",
    interactions: interactions.map((i) => ({ date: i.date, summary: i.summary })),
    productTags: db.product_tags ?? [],
  };
}

const PAGE_SIZE = 1000;
const MAX_CONTACTS = 3000;
const MAX_INTERACTIONS = 10000;

async function fetchPaginated<T>(
  queryFn: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  maxRows: number
): Promise<T[]> {
  let all: T[] = [];
  let from = 0;
  while (from < maxRows) {
    const { data, error } = await queryFn(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all = [...all, ...(data ?? [])];
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

export function useContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!user) { setContacts([]); setLoading(false); return; }
    setLoading(true);

    try {
      const [allContacts, allInteractions] = await Promise.all([
        fetchPaginated<DbContact>(
          (from, to) => supabase.from("contacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).range(from, to) as any,
          MAX_CONTACTS
        ),
        fetchPaginated<DbInteraction>(
          (from, to) => supabase.from("interactions").select("*").eq("user_id", user.id).order("date", { ascending: false }).range(from, to) as any,
          MAX_INTERACTIONS
        ),
      ]);

      // Build interaction map for O(n) lookup
      const interactionMap = new Map<string, DbInteraction[]>();
      for (const i of allInteractions) {
        const arr = interactionMap.get(i.contact_id) ?? [];
        arr.push(i);
        interactionMap.set(i.contact_id, arr);
      }

      const mapped = allContacts.map((c) => dbToContact(c, interactionMap));
      setContacts(mapped);
    } catch {
      toast.error("載入資料失敗");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const addContact = useCallback(async (contact: Contact) => {
    if (!user) return;
    const { error } = await supabase.from("contacts").insert({
      id: contact.id,
      user_id: user.id,
      name: contact.name,
      nickname: contact.nickname || null,
      member_id: contact.memberId || null,
      region: contact.region,
      background: contact.background,
      statuses: contact.statuses,
      heat: contact.heat,
      notes: contact.notes,
      last_contact_date: contact.lastContactDate,
      next_follow_up_date: contact.nextFollowUpDate || null,
      next_follow_up_note: contact.nextFollowUpNote || null,
      next_follow_up_time: contact.nextFollowUpTime || null,
      contact_method: contact.contactMethod || null,
      avatar_url: contact.avatarUrl || null,
      referrer_id: contact.referrerId || null,
      referrer_name: contact.referrerName || null,
      birthday: contact.birthday || null,
      birthday_reminder: contact.birthdayReminder || "none",
      gender: contact.gender || null,
      product_tags: contact.productTags,
    });
    if (error) { toast.error("新增失敗"); return; }

    if (contact.interactions?.length) {
      await supabase.from("interactions").insert(
        contact.interactions.map((i) => ({
          contact_id: contact.id,
          user_id: user.id,
          date: i.date,
          summary: i.summary,
        }))
      );
    }

    await fetchContacts();
  }, [user, fetchContacts]);

  const updateContact = useCallback(async (contact: Contact) => {
    if (!user) return;
    const { error } = await supabase.from("contacts").update({
      name: contact.name,
      nickname: contact.nickname || null,
      member_id: contact.memberId || null,
      region: contact.region,
      background: contact.background,
      statuses: contact.statuses,
      heat: contact.heat,
      notes: contact.notes,
      last_contact_date: contact.lastContactDate,
      next_follow_up_date: contact.nextFollowUpDate || null,
      next_follow_up_note: contact.nextFollowUpNote || null,
      next_follow_up_time: contact.nextFollowUpTime || null,
      contact_method: contact.contactMethod || null,
      avatar_url: contact.avatarUrl || null,
      referrer_id: contact.referrerId || null,
      referrer_name: contact.referrerName || null,
      birthday: contact.birthday || null,
      birthday_reminder: contact.birthdayReminder || "none",
      gender: contact.gender || null,
      product_tags: contact.productTags,
    }).eq("id", contact.id).eq("user_id", user.id);
    if (error) { toast.error("更新失敗"); return; }
    await fetchContacts();
  }, [user, fetchContacts]);

  const deleteContact = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("contacts").delete().eq("id", id).eq("user_id", user.id);
    if (error) { toast.error("刪除失敗"); return; }
    await fetchContacts();
  }, [user, fetchContacts]);

  const addInteraction = useCallback(async (contactId: string, interaction: Interaction) => {
    if (!user) return;
    const { error } = await supabase.from("interactions").insert({
      contact_id: contactId,
      user_id: user.id,
      date: interaction.date,
      summary: interaction.summary,
    });
    if (error) { toast.error("新增互動失敗"); return; }
    await supabase.from("contacts").update({ last_contact_date: interaction.date }).eq("id", contactId).eq("user_id", user.id);
    await fetchContacts();
  }, [user, fetchContacts]);

  const deleteInteraction = useCallback(async (contactId: string, interaction: Interaction) => {
    if (!user) return;
    const { data } = await supabase.from("interactions")
      .select("id")
      .eq("contact_id", contactId)
      .eq("user_id", user.id)
      .eq("date", interaction.date)
      .eq("summary", interaction.summary)
      .limit(1);
    if (data && data.length > 0) {
      await supabase.from("interactions").delete().eq("id", data[0].id);
    }
    await fetchContacts();
  }, [user, fetchContacts]);

  const importContacts = useCallback(async (imported: Contact[]) => {
    if (!user) return;

    const { data: existing } = await supabase
      .from("contacts")
      .select("id, member_id, name")
      .eq("user_id", user.id);

    const existingByMemberId = new Map<string, string>();
    const existingByName = new Map<string, string>();
    for (const e of (existing ?? [])) {
      if (e.member_id) existingByMemberId.set(e.member_id, e.id);
      existingByName.set(e.name, e.id);
    }

    let merged = 0;
    let added = 0;

    // Batch imports in chunks to avoid timeouts
    const BATCH_SIZE = 50;
    for (let i = 0; i < imported.length; i += BATCH_SIZE) {
      const batch = imported.slice(i, i + BATCH_SIZE);
      for (const c of batch) {
        const matchId = (c.memberId && existingByMemberId.get(c.memberId))
          || existingByName.get(c.name)
          || null;

        const payload = {
          name: c.name,
          nickname: c.nickname || null,
          member_id: c.memberId || null,
          region: c.region,
          background: c.background,
          statuses: c.statuses,
          heat: c.heat,
          notes: c.notes,
          last_contact_date: c.lastContactDate,
          next_follow_up_date: c.nextFollowUpDate || null,
          contact_method: c.contactMethod || null,
          birthday: c.birthday || null,
          birthday_reminder: c.birthdayReminder || "none",
          product_tags: c.productTags,
        };

        if (matchId) {
          await supabase.from("contacts").update(payload).eq("id", matchId).eq("user_id", user.id);
          merged++;
        } else {
          await supabase.from("contacts").insert({ ...payload, id: c.id, user_id: user.id });
          added++;
        }
      }
    }

    if (merged > 0) {
      toast.success(`已合併 ${merged} 筆重複名單，新增 ${added} 筆`);
    }

    await fetchContacts();
  }, [user, fetchContacts]);

  const deduplicateContacts = useCallback(async () => {
    if (!user) return { merged: 0 };

    const allContacts = await fetchPaginated<DbContact>(
      (from, to) => supabase.from("contacts").select("*").eq("user_id", user.id).order("created_at", { ascending: true }).range(from, to) as any,
      MAX_CONTACTS
    );

    if (!allContacts || allContacts.length === 0) return { merged: 0 };

    const getBaseMemberId = (mid: string | null) => {
      if (!mid) return null;
      const match = mid.match(/^(\d+)-\d+$/);
      return match ? match[1] : mid;
    };

    const byBaseMemberId = new Map<string, typeof allContacts>();
    const byName = new Map<string, typeof allContacts>();

    for (const c of allContacts) {
      const base = getBaseMemberId(c.member_id);
      if (base) {
        const existing = byBaseMemberId.get(base) || [];
        existing.push(c);
        byBaseMemberId.set(base, existing);
      } else {
        const existing = byName.get(c.name) || [];
        existing.push(c);
        byName.set(c.name, existing);
      }
    }

    const idsToDelete: string[] = [];

    for (const [_, group] of byBaseMemberId) {
      if (group.length > 1) {
        const primary = group[0];
        const newest = group[group.length - 1];
        const allMemberIds = group.map(c => c.member_id).filter(Boolean).join(', ');
        const merged = {
          ...primary,
          ...newest,
          id: primary.id,
          member_id: primary.member_id,
          notes: primary.notes
            ? `${primary.notes}\n[多經營權: ${allMemberIds}]`
            : `[多經營權: ${allMemberIds}]`,
        };
        await supabase.from("contacts").update(merged).eq("id", primary.id);
        for (let i = 1; i < group.length; i++) {
          idsToDelete.push(group[i].id);
        }
      }
    }

    for (const [_, group] of byName) {
      if (group.length > 1) {
        const primary = group[0];
        const newest = group[group.length - 1];
        const merged = { ...primary, ...newest, id: primary.id };
        await supabase.from("contacts").update(merged).eq("id", primary.id);
        for (let i = 1; i < group.length; i++) {
          idsToDelete.push(group[i].id);
        }
      }
    }

    if (idsToDelete.length > 0) {
      // Delete in batches to avoid URL length limits
      for (let i = 0; i < idsToDelete.length; i += 100) {
        const batch = idsToDelete.slice(i, i + 100);
        await supabase.from("contacts").delete().in("id", batch);
      }
    }

    await fetchContacts();
    return { merged: idsToDelete.length };
  }, [user, fetchContacts]);

  return { contacts, loading, addContact, updateContact, deleteContact, addInteraction, deleteInteraction, importContacts, deduplicateContacts, refetch: fetchContacts };
}
