import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Contact, HeatLevel } from "@/data/contacts";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { Upload, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (contacts: Contact[]) => void;
  existingContacts: Contact[];
}

const FIELD_MAP: Record<string, keyof Contact | "statuses" | "productTags"> = {
  "姓名": "name",
  "name": "name",
  "暱稱": "nickname",
  "nickname": "nickname",
  "會員編號": "memberId",
  "memberid": "memberId",
  "地區": "region",
  "region": "region",
  "背景": "background",
  "職業": "background",
  "background": "background",
  "狀態": "statuses",
  "status": "statuses",
  "statuses": "statuses",
  "熱度": "heat",
  "heat": "heat",
  "註記": "notes",
  "notes": "notes",
  "聯絡方式": "contactMethod",
  "contactmethod": "contactMethod",
  "生日": "birthday",
  "birthday": "birthday",
  "最後聯絡": "lastContactDate",
  "lastcontactdate": "lastContactDate",
  "下次追蹤": "nextFollowUpDate",
  "下次邀約\\課程時間": "nextFollowUpDate",
  "nextfollowupdate": "nextFollowUpDate",
  "產品標籤": "productTags",
  "producttags": "productTags",
};

const HEAT_MAP: Record<string, HeatLevel> = {
  "熱": "hot", "hot": "hot", "🔥": "hot",
  "溫": "warm", "warm": "warm", "🌤": "warm",
  "冷": "cold", "cold": "cold", "🧊": "cold",
  "忠實": "loyal", "loyal": "loyal", "💎": "loyal",
};

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

function isOrgChartCsv(lines: string[]): boolean {
  return lines.length > 0 && lines[0].includes("組織圖") && lines[0].includes("ＭＡＰ");
}

function parseOrgChartDate(raw: string): string {
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!m) return "";
  const yy = parseInt(m[1], 10);
  const year = yy >= 50 ? 1900 + yy : 2000 + yy;
  return `${year}-${m[2]}-${m[3]}`;
}

function parsePurchaseDate(raw: string): string {
  const m = raw.match(/\(?\d{1,2}\)?(\d{2})\/(\d{2})\/(\d{2})/);
  if (!m) return "";
  const yy = parseInt(m[1], 10);
  const year = yy >= 50 ? 1900 + yy : 2000 + yy;
  return `${year}-${m[2]}-${m[3]}`;
}

function determineHeatFromPay(pay: string, sp: string): HeatLevel {
  const payNum = parseInt(pay.replace(/[^0-9]/g, ""), 10) || 0;
  const spNum = parseInt(sp, 10) || 0;
  if (payNum >= 4 || spNum >= 2) return "hot";
  if (payNum >= 3) return "warm";
  if (payNum >= 1) return "warm";
  return "cold";
}

function parseOrgChartCsv(text: string): { contacts: Contact[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const contacts: Contact[] = [];
  const errors: string[] = [];
  const today = new Date().toISOString().split("T")[0];
  const seenIds = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const idCol = cols[2]?.trim() ?? "";
    if (!/^\d{5,}-\d{3}$/.test(idCol)) continue;

    const name = cols[3]?.trim() ?? "";
    if (!name || name.includes("********")) continue;
    if (seenIds.has(idCol)) { errors.push(`第 ${i + 1} 行：重複 ID ${idCol}，已跳過`); continue; }
    seenIds.add(idCol);

    const region = cols[4]?.trim() ?? "";
    const regDate = cols[5]?.trim() ?? "";
    const pay = cols[6]?.trim() ?? "";
    const sp = cols[11]?.trim() ?? "";
    const lastPurchaseRaw = cols[15]?.trim() ?? cols[14]?.trim() ?? "";

    const parsedRegDate = parseOrgChartDate(regDate);
    const parsedLastPurchase = parsePurchaseDate(lastPurchaseRaw);
    const heat = determineHeatFromPay(pay, sp);

    const c: Contact = {
      id: crypto.randomUUID(),
      name,
      memberId: idCol,
      region: region === "TWN" ? "台灣" : region,
      background: "",
      statuses: [],
      heat,
      notes: `登錄日: ${parsedRegDate || regDate}`,
      lastContactDate: parsedLastPurchase || today,
      nextFollowUpDate: today,
      interactions: [],
      productTags: [],
    };

    contacts.push(c);
  }

  if (contacts.length === 0) {
    errors.push("未找到有效的聯絡人資料（已遮蔽的姓名會自動跳過）");
  }

  return { contacts, errors };
}

function parseCsv(text: string, existingContacts: Contact[]): { contacts: Contact[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { contacts: [], errors: ["CSV 檔案至少需要標題列和一筆資料"] };

  if (isOrgChartCsv(lines)) {
    return parseOrgChartCsv(text);
  }

  const headers = parseCsvLine(lines[0]);
  const fieldIndices: { field: string; index: number }[] = [];
  headers.forEach((h, i) => {
    const key = FIELD_MAP[h.trim().toLowerCase()] ?? FIELD_MAP[h.trim()];
    if (key) fieldIndices.push({ field: key, index: i });
  });

  const nameIdx = fieldIndices.find(f => f.field === "name");
  if (!nameIdx) return { contacts: [], errors: ["找不到「姓名」或「name」欄位"] };

  const today = new Date().toISOString().split("T")[0];
  const contacts: Contact[] = [];
  const errors: string[] = [];

  for (let row = 1; row < lines.length; row++) {
    const cols = parseCsvLine(lines[row]);
    const name = cols[nameIdx.index]?.trim();
    if (!name) { errors.push(`第 ${row + 1} 行：缺少姓名，已跳過`); continue; }

    const c: Contact = {
      id: crypto.randomUUID(),
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
          c.statuses = val.split(/[,、;／]/).map(s => s.trim()).filter(Boolean);
          break;
        case "productTags":
          c.productTags = val.split(/[,、;／]/).map(s => s.trim()).filter(Boolean);
          break;
        case "heat":
          c.heat = HEAT_MAP[val.toLowerCase()] ?? HEAT_MAP[val] ?? "cold";
          break;
        default:
          (c as any)[field] = val;
      }
    }
    contacts.push(c);
  }

  return { contacts, errors };
}

export function CsvImportDialog({ open, onOpenChange, onImport, existingContacts }: CsvImportDialogProps) {
  const [preview, setPreview] = useState<Contact[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setPreview(null); setErrors([]); setFileName(""); };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { contacts, errors } = parseCsv(text, existingContacts);
      setPreview(contacts);
      setErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = () => {
    if (preview && preview.length > 0) {
      onImport(preview);
      toast.success(`成功匯入 ${preview.length} 筆聯絡人`);
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="bg-card border-border max-w-lg w-[calc(100vw-2rem)] overflow-hidden max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-foreground">{"匯入 CSV"}</DialogTitle>
          <DialogDescription>{"上傳 CSV 檔案，系統將自動解析並加入名單"}</DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4 pt-2">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{"拖曳 CSV 檔案至此，或點擊選擇"}</p>
              <p className="text-xs text-muted-foreground mt-1">{"支援一般 CSV 及組織圖 MAP 格式（自動偵測）"}</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

            <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1">
              <p className="text-xs font-medium text-foreground">{"CSV 格式範例："}</p>
              <pre className="text-[11px] text-muted-foreground overflow-x-auto font-mono whitespace-pre-wrap break-all">
{`姓名,地區,背景,狀態,熱度,聯絡方式,生日,產品標籤
王小明,台北,工程師,愛用者、鐵粉,熱,https://instagram.com/wang,1990-05-15,辨霸、水素水
李美麗,高雄,護理師,初步接觸,溫,LINE: beauty123,1985-12-01,明利多`}
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm truncate">{fileName}</span>
              <span className="text-xs text-muted-foreground ml-auto shrink-0">{"解析到"} {preview.length} {"筆"}</span>
            </div>

            {errors.length > 0 && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {errors.length} {"個警告"}
                </div>
                {errors.slice(0, 3).map((e, i) => <p key={i} className="text-xs text-destructive/80">{e}</p>)}
                {errors.length > 3 && <p className="text-xs text-destructive/60">{"…還有"} {errors.length - 3} {"個"}</p>}
              </div>
            )}

            {preview.length > 0 && (
              <div className="rounded-lg border border-border max-h-48 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">{"姓名"}</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">{"地區"}</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">{"狀態"}</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">{"熱度"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((c, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-1.5">{c.name}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{c.region || "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{c.statuses.join(", ") || "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{c.heat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && <p className="text-xs text-muted-foreground text-center py-2">{"…還有"} {preview.length - 10} {"筆"}</p>}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { reset(); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-surface-hover transition-colors">
                {"重新選擇"}
              </button>
              <button onClick={handleConfirm} disabled={preview.length === 0} className="neon-btn-cyan disabled:opacity-50">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {"確認匯入"} {preview.length} {"筆"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
