import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Contact, Interaction, HeatLevel, BirthdayReminder } from "@/data/contacts";
import { toast } from "sonner";

interface DbContact {
  id: string;
  user_id: string;
  name: string;
  nickname: string | null;
  region: string;
  background: string;
  statuses: string[];
  heat: string;
  notes: string;
  last_contact_date: string;
  next_follow_up_date: string;
  next_follow_up_note: string | null;
  next_follow_up_time: string | null;
  contact_method: string | null;
  avatar_url: string | null;
  referrer_id: string | null;
  referrer_name: string | null;
  birthday: string | null;
  birthday_reminder: string;
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

function dbToContact(db: DbContact, interactions: DbInteraction[]): Contact {
  return {
    id: db.id,
    name: db.name,
    nickname: db.nickname ?? undefined,
    region: db.region,
    background: db.background,
    statuses: db.statuses ?? [],
    heat: (db.heat as HeatLevel) ?? "cold",
    notes: db.notes,
    lastContactDate: db.last_contact_date,
    nextFollowUpDate: db.next_follow_up_date,
    nextFollowUpNote: db.next_follow_up_note ?? undefined,
    nextFollowUpTime: db.next_follow_up_time ?? undefined,
    contactMethod: db.contact_method ?? undefined,
    avatarUrl: db.avatar_url ?? undefined,
    referrerId: db.referrer_id ?? undefined,
    referrerName: db.referrer_name ?? undefined,
    birthday: db.birthday ?? undefined,
    birthdayReminder: (db.birthday_reminder as BirthdayReminder) ?? "none",
    interactions: interactions
      .filter((i) => i.contact_id === db.id)
      .map((i) => ({ date: i.date, summary: i.summary })),
    productTags: db.product_tags ?? [],
  };
}

export function useContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!user) { setContacts([]); setLoading(false); return; }
    setLoading(true);

    const [{ data: dbContacts, error: cErr }, { data: dbInteractions, error: iErr }] = await Promise.all([
      supabase.from("contacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("interactions").select("*").eq("user_id", user.id).order("date", { ascending: false }),
    ]);

    if (cErr || iErr) {
      toast.error("載入資料失敗");
      setLoading(false);
      return;
    }

    const mapped = (dbContacts as DbContact[]).map((c) =>
      dbToContact(c, (dbInteractions as DbInteraction[]) ?? [])
    );
    setContacts(mapped);
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
      region: contact.region,
      background: contact.background,
      statuses: contact.statuses,
      heat: contact.heat,
      notes: contact.notes,
      last_contact_date: contact.lastContactDate,
      next_follow_up_date: contact.nextFollowUpDate,
      next_follow_up_note: contact.nextFollowUpNote || null,
      next_follow_up_time: contact.nextFollowUpTime || null,
      contact_method: contact.contactMethod || null,
      avatar_url: contact.avatarUrl || null,
      referrer_id: contact.referrerId || null,
      referrer_name: contact.referrerName || null,
      birthday: contact.birthday || null,
      birthday_reminder: contact.birthdayReminder || "none",
      product_tags: contact.productTags,
    });
    if (error) { toast.error("新增失敗"); return; }

    // Insert interactions if any
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
      region: contact.region,
      background: contact.background,
      statuses: contact.statuses,
      heat: contact.heat,
      notes: contact.notes,
      last_contact_date: contact.lastContactDate,
      next_follow_up_date: contact.nextFollowUpDate,
      next_follow_up_note: contact.nextFollowUpNote || null,
      next_follow_up_time: contact.nextFollowUpTime || null,
      contact_method: contact.contactMethod || null,
      avatar_url: contact.avatarUrl || null,
      referrer_id: contact.referrerId || null,
      referrer_name: contact.referrerName || null,
      birthday: contact.birthday || null,
      birthday_reminder: contact.birthdayReminder || "none",
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
    await fetchContacts();
  }, [user, fetchContacts]);

  const importContacts = useCallback(async (imported: Contact[]) => {
    if (!user) return;
    for (const c of imported) {
      await supabase.from("contacts").insert({
        id: c.id,
        user_id: user.id,
        name: c.name,
        nickname: c.nickname || null,
        region: c.region,
        background: c.background,
        statuses: c.statuses,
        heat: c.heat,
        notes: c.notes,
        last_contact_date: c.lastContactDate,
        next_follow_up_date: c.nextFollowUpDate,
        contact_method: c.contactMethod || null,
        birthday: c.birthday || null,
        birthday_reminder: c.birthdayReminder || "none",
        product_tags: c.productTags,
      });
    }
    await fetchContacts();
  }, [user, fetchContacts]);

  return { contacts, loading, addContact, updateContact, deleteContact, addInteraction, importContacts, refetch: fetchContacts };
}
