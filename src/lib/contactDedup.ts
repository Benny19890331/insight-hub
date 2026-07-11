export interface DedupeCandidate {
  id: string;
  name: string;
  member_id?: string | null;
  created_at?: string | null;
}

export interface ContactMergeGroup<T extends DedupeCandidate> {
  key: string;
  kind: "member" | "name";
  primary: T;
  duplicates: T[];
  all: T[];
}

export const normalizeMemberId = (memberId?: string | null): string | null => {
  const normalized = memberId?.normalize("NFKC").trim().toLowerCase();
  return normalized || null;
};

export const getBaseMemberId = (memberId?: string | null): string | null => {
  const normalized = normalizeMemberId(memberId);
  if (!normalized) return null;
  const match = normalized.match(/^(\d+)-\d+$/);
  return match ? match[1] : normalized;
};

export const normalizeContactName = (name: string): string =>
  name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("zh-TW");

export const getContactDuplicateKey = (
  contact: Pick<DedupeCandidate, "name" | "member_id">,
): { key: string; kind: "member" | "name" } | null => {
  const memberBase = getBaseMemberId(contact.member_id);
  if (memberBase) return { key: `member:${memberBase}`, kind: "member" };

  const name = normalizeContactName(contact.name);
  return name ? { key: `name:${name}`, kind: "name" } : null;
};

const timestamp = (value?: string | null): number => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** Build a deterministic merge plan without an O(n²) scan. */
export function planContactMerges<T extends DedupeCandidate>(contacts: T[]): ContactMergeGroup<T>[] {
  const groups = new Map<string, { kind: "member" | "name"; rows: T[] }>();

  for (const contact of contacts) {
    const duplicateKey = getContactDuplicateKey(contact);
    if (!duplicateKey) continue;
    const group = groups.get(duplicateKey.key) ?? { kind: duplicateKey.kind, rows: [] };
    group.rows.push(contact);
    groups.set(duplicateKey.key, group);
  }

  const result: ContactMergeGroup<T>[] = [];
  for (const [key, group] of groups) {
    if (group.rows.length < 2) continue;

    const sorted = [...group.rows].sort((a, b) => {
      if (group.kind === "member") {
        const aPrimary = normalizeMemberId(a.member_id)?.endsWith("-001") ? 0 : 1;
        const bPrimary = normalizeMemberId(b.member_id)?.endsWith("-001") ? 0 : 1;
        if (aPrimary !== bPrimary) return aPrimary - bPrimary;
      }
      const createdDiff = timestamp(a.created_at) - timestamp(b.created_at);
      return createdDiff || a.id.localeCompare(b.id);
    });

    result.push({
      key,
      kind: group.kind,
      primary: sorted[0],
      duplicates: sorted.slice(1),
      all: sorted,
    });
  }

  return result;
}

export const countDuplicateContacts = (contacts: DedupeCandidate[]): number =>
  planContactMerges(contacts).reduce((total, group) => total + group.duplicates.length, 0);
