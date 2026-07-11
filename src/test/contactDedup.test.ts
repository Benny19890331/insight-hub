import { describe, expect, it } from "vitest";
import {
  countDuplicateContacts,
  getBaseMemberId,
  planContactMerges,
} from "@/lib/contactDedup";

describe("contact deduplication planning", () => {
  it("normalizes full-width member IDs", () => {
    expect(getBaseMemberId("１５９６８８７－００２")).toBe("1596887");
  });

  it("finds duplicates beyond the old 3,000 row boundary", () => {
    const contacts = Array.from({ length: 4_500 }, (_, index) => ({
      id: `contact-${index.toString().padStart(4, "0")}`,
      name: `聯絡人${index}`,
      member_id: `${800_000 + index}-001`,
      created_at: new Date(2026, 0, 1, 0, 0, index % 60).toISOString(),
    }));

    contacts[120] = {
      ...contacts[120],
      name: "多經營權測試",
      member_id: "1596887-001",
      created_at: "2026-01-02T00:00:00.000Z",
    };
    contacts[4_320] = {
      ...contacts[4_320],
      name: "多經營權測試",
      member_id: "1596887-002",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    contacts[200] = {
      ...contacts[200],
      name: "王 小明",
      member_id: null,
    };
    contacts[4_499] = {
      ...contacts[4_499],
      name: " 王   小明 ",
      member_id: null,
    };

    const groups = planContactMerges(contacts);
    expect(groups).toHaveLength(2);
    expect(countDuplicateContacts(contacts)).toBe(2);

    const memberGroup = groups.find((group) => group.kind === "member");
    expect(memberGroup?.primary.member_id).toBe("1596887-001");
    expect(memberGroup?.duplicates[0].id).toBe(contacts[4_320].id);
  });

  it("does not merge equal names when both rows have different member IDs", () => {
    const groups = planContactMerges([
      { id: "a", name: "陳小明", member_id: "100001-001", created_at: "2026-01-01" },
      { id: "b", name: "陳小明", member_id: "200002-001", created_at: "2026-01-02" },
    ]);
    expect(groups).toHaveLength(0);
  });
});
