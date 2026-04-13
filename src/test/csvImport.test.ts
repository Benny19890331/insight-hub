import { describe, it, expect } from "vitest";

// Extract parse logic for testing - we'll import the internal functions
// by re-declaring them here (since they're not exported from the component)

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const FIELD_MAP: Record<string, string> = {
  "姓名": "name", "name": "name",
  "暱稱": "nickname", "nickname": "nickname",
  "會員編號": "memberId", "memberid": "memberId",
  "地區": "region", "region": "region",
  "背景": "background", "職業": "background", "background": "background",
  "狀態": "statuses", "status": "statuses", "statuses": "statuses",
  "熱度": "heat", "heat": "heat",
  "註記": "notes", "notes": "notes",
  "聯絡方式": "contactMethod", "contactmethod": "contactMethod",
  "生日": "birthday", "birthday": "birthday",
  "最後聯絡": "lastContactDate", "lastcontactdate": "lastContactDate",
  "下次追蹤": "nextFollowUpDate", "nextfollowupdate": "nextFollowUpDate",
  "產品標籤": "productTags", "producttags": "productTags",
};

const HEAT_MAP: Record<string, string> = {
  "熱": "hot", "hot": "hot", "🔥": "hot",
  "溫": "warm", "warm": "warm", "🌤": "warm",
  "冷": "cold", "cold": "cold", "🧊": "cold",
  "忠實": "loyal", "loyal": "loyal", "💎": "loyal",
};

function parseCsv(text: string): { contacts: any[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { contacts: [], errors: ["CSV 檔案至少需要標題列和一筆資料"] };

  const headers = parseCsvLine(lines[0]);
  const fieldIndices: { field: string; index: number }[] = [];
  headers.forEach((h, i) => {
    const key = FIELD_MAP[h.trim().toLowerCase()] ?? FIELD_MAP[h.trim()];
    if (key) fieldIndices.push({ field: key, index: i });
  });

  const nameIdx = fieldIndices.find(f => f.field === "name");
  if (!nameIdx) return { contacts: [], errors: ["找不到「姓名」或「name」欄位"] };

  const today = new Date().toISOString().split("T")[0];
  const contacts: any[] = [];
  const errors: string[] = [];

  for (let row = 1; row < lines.length; row++) {
    const cols = parseCsvLine(lines[row]);
    const name = cols[nameIdx.index]?.trim();
    if (!name) { errors.push(`第 ${row + 1} 行：缺少姓名，已跳過`); continue; }

    const c: any = {
      name,
      region: "",
      background: "",
      statuses: [],
      heat: "cold",
      notes: "",
      lastContactDate: today,
      nextFollowUpDate: today,
      interactions: [],
      productTags: [],
    };

    for (const { field, index } of fieldIndices) {
      const val = cols[index]?.trim() ?? "";
      if (!val || field === "name") continue;
      switch (field) {
        case "statuses":
          c.statuses = val.split(/[,、;／]/).map((s: string) => s.trim()).filter(Boolean);
          break;
        case "productTags":
          c.productTags = val.split(/[,、;／]/).map((s: string) => s.trim()).filter(Boolean);
          break;
        case "heat":
          c.heat = HEAT_MAP[val.toLowerCase()] ?? HEAT_MAP[val] ?? "cold";
          break;
        default:
          c[field] = val;
      }
    }
    contacts.push(c);
  }

  return { contacts, errors };
}

describe("CSV Line Parser", () => {
  it("parses simple CSV line", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields with commas", () => {
    expect(parseCsvLine('"hello, world",b,c')).toEqual(["hello, world", "b", "c"]);
  });

  it("handles escaped quotes", () => {
    expect(parseCsvLine('"say ""hi""",b')).toEqual(['say "hi"', "b"]);
  });

  it("handles empty fields", () => {
    expect(parseCsvLine("a,,c")).toEqual(["a", "", "c"]);
  });

  it("trims whitespace", () => {
    expect(parseCsvLine(" a , b , c ")).toEqual(["a", "b", "c"]);
  });
});

describe("CSV Import - Standard Format", () => {
  it("parses basic Chinese headers", () => {
    const csv = `姓名,地區,背景,狀態,熱度
王小明,台北,工程師,愛用者,熱`;
    const { contacts, errors } = parseCsv(csv);
    expect(errors).toHaveLength(0);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe("王小明");
    expect(contacts[0].region).toBe("台北");
    expect(contacts[0].background).toBe("工程師");
    expect(contacts[0].statuses).toEqual(["愛用者"]);
    expect(contacts[0].heat).toBe("hot");
  });

  it("parses English headers", () => {
    const csv = `name,region,background,heat
John,Taipei,Engineer,warm`;
    const { contacts, errors } = parseCsv(csv);
    expect(errors).toHaveLength(0);
    expect(contacts[0].name).toBe("John");
    expect(contacts[0].heat).toBe("warm");
  });

  it("parses multiple statuses separated by 、", () => {
    const csv = `姓名,狀態
王小明,愛用者、鐵粉、VIP`;
    const { contacts } = parseCsv(csv);
    expect(contacts[0].statuses).toEqual(["愛用者", "鐵粉", "VIP"]);
  });

  it("parses product tags", () => {
    const csv = `姓名,產品標籤
王小明,辨霸、水素水、明利多`;
    const { contacts } = parseCsv(csv);
    expect(contacts[0].productTags).toEqual(["辨霸", "水素水", "明利多"]);
  });

  it("handles heat level mapping", () => {
    const csv = `姓名,熱度
A,熱
B,溫
C,冷
D,忠實
E,unknown`;
    const { contacts } = parseCsv(csv);
    expect(contacts.map((c: any) => c.heat)).toEqual(["hot", "warm", "cold", "loyal", "cold"]);
  });

  it("skips rows without name", () => {
    const csv = `姓名,地區
王小明,台北
,高雄
李美麗,台中`;
    const { contacts, errors } = parseCsv(csv);
    expect(contacts).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("缺少姓名");
  });

  it("returns error for missing name column", () => {
    const csv = `地區,背景
台北,工程師`;
    const { contacts, errors } = parseCsv(csv);
    expect(contacts).toHaveLength(0);
    expect(errors[0]).toContain("找不到");
  });

  it("returns error for empty CSV", () => {
    const { contacts, errors } = parseCsv("");
    expect(contacts).toHaveLength(0);
    expect(errors[0]).toContain("至少需要");
  });

  it("handles BOM-stripped text correctly", () => {
    const csv = `姓名,地區\n王小明,台北`;
    const { contacts } = parseCsv(csv);
    expect(contacts).toHaveLength(1);
  });

  it("parses birthday and contact method", () => {
    const csv = `姓名,生日,聯絡方式
王小明,1990-05-15,LINE: wang123`;
    const { contacts } = parseCsv(csv);
    expect(contacts[0].birthday).toBe("1990-05-15");
    expect(contacts[0].contactMethod).toBe("LINE: wang123");
  });

  it("handles nickname and memberId", () => {
    const csv = `姓名,暱稱,會員編號
王小明,小明,A12345`;
    const { contacts } = parseCsv(csv);
    expect(contacts[0].nickname).toBe("小明");
    expect(contacts[0].memberId).toBe("A12345");
  });

  it("handles multiple rows correctly", () => {
    const csv = `姓名,地區,熱度
A,台北,熱
B,高雄,溫
C,台中,冷
D,台南,忠實`;
    const { contacts } = parseCsv(csv);
    expect(contacts).toHaveLength(4);
  });

  it("handles quoted fields in CSV", () => {
    const csv = `姓名,註記
王小明,"這是一段很長的備註, 包含逗號"`;
    const { contacts } = parseCsv(csv);
    expect(contacts[0].notes).toBe("這是一段很長的備註, 包含逗號");
  });
});
