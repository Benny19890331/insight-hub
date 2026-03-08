import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Contact, HeatLevel, heatOptions } from "@/data/contacts";
import { toast } from "sonner";

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  onSave: (updated: Contact) => void;
}

export function EditContactDialog({ open, onOpenChange, contact, onSave }: EditContactDialogProps) {
  const [name, setName] = useState(contact.name);
  const [region, setRegion] = useState(contact.region);
  const [background, setBackground] = useState(contact.background);
  const [status, setStatus] = useState(contact.status);
  const [heat, setHeat] = useState<HeatLevel>(contact.heat);
  const [notes, setNotes] = useState(contact.notes);
  const [productTags, setProductTags] = useState(contact.productTags?.join(", ") ?? "");

  useEffect(() => {
    setName(contact.name);
    setRegion(contact.region);
    setBackground(contact.background);
    setStatus(contact.status);
    setHeat(contact.heat);
    setNotes(contact.notes);
    setProductTags(contact.productTags?.join(", ") ?? "");
  }, [contact]);

  const handleSave = () => {
    const updated: Contact = {
      ...contact,
      name, region, background, status, heat, notes,
      productTags: productTags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    onSave(updated);
    onOpenChange(false);
    toast.success("資料已更新");
  };

  const fieldClass = "w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">編輯客戶資料</DialogTitle>
          <DialogDescription>修改 {contact.name} 的資訊</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 pt-2">
          <Field label="姓名"><input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} /></Field>
          <Field label="地區"><input value={region} onChange={(e) => setRegion(e.target.value)} className={fieldClass} /></Field>
          <Field label="背景 / 職業"><input value={background} onChange={(e) => setBackground(e.target.value)} className={fieldClass} /></Field>
          <Field label="當前狀態"><input value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass} /></Field>
          <Field label="熱度">
            <select value={heat} onChange={(e) => setHeat(e.target.value as HeatLevel)} className={`${fieldClass} cursor-pointer`}>
              {heatOptions.filter((o) => o.value !== "all").map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="產品標籤（逗號分隔）"><input value={productTags} onChange={(e) => setProductTags(e.target.value)} placeholder="識霸, 水素水, 三茶" className={fieldClass} /></Field>
          <Field label="特殊註記"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${fieldClass} resize-none`} /></Field>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-surface-hover transition-colors">
              取消
            </button>
            <button onClick={handleSave} className="neon-btn-amber">
              儲存變更
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
