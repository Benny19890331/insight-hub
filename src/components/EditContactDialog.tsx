import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Contact, HeatLevel, heatOptions, productOptions, statusOptions } from "@/data/contacts";
import { toast } from "sonner";
import { Camera } from "lucide-react";

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  onSave: (updated: Contact) => void;
  contacts?: Contact[];
}

export function EditContactDialog({ open, onOpenChange, contact, onSave, contacts = [] }: EditContactDialogProps) {
  const [name, setName] = useState(contact.name);
  const [region, setRegion] = useState(contact.region);
  const [background, setBackground] = useState(contact.background);
  const [status, setStatus] = useState(contact.status);
  const [heat, setHeat] = useState<HeatLevel>(contact.heat);
  const [notes, setNotes] = useState(contact.notes);
  const [selectedTags, setSelectedTags] = useState<string[]>(contact.productTags ?? []);
  const [contactMethod, setContactMethod] = useState(contact.contactMethod ?? "");
  const [avatarUrl, setAvatarUrl] = useState(contact.avatarUrl ?? "");
  const [referrerId, setReferrerId] = useState(contact.referrerId ?? "");
  const [birthday, setBirthday] = useState(contact.birthday ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(contact.name);
    setRegion(contact.region);
    setBackground(contact.background);
    setStatus(contact.status);
    setHeat(contact.heat);
    setNotes(contact.notes);
    setSelectedTags(contact.productTags ?? []);
    setContactMethod(contact.contactMethod ?? "");
    setAvatarUrl(contact.avatarUrl ?? "");
    setReferrerId(contact.referrerId ?? "");
    setBirthday(contact.birthday ?? "");
  }, [contact]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const selectedReferrer = contacts.find((c) => c.id === referrerId);

  const handleSave = () => {
    const updated: Contact = {
      ...contact,
      name, region, background, status, heat, notes,
      productTags: selectedTags,
      contactMethod,
      avatarUrl,
      referrerId: referrerId || undefined,
      referrerName: selectedReferrer?.name ?? undefined,
      birthday: birthday || undefined,
    };
    onSave(updated);
    onOpenChange(false);
    toast.success("資料已更新");
  };

  const fieldClass = "w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
  const otherContacts = contacts.filter((c) => c.id !== contact.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">編輯客戶資料</DialogTitle>
          <DialogDescription>修改 {contact.name} 的資訊</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 pt-2">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div
              className="relative h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-primary text-xl font-bold">{contact.name.charAt(0)}</span>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <span className="text-xs text-muted-foreground">點擊頭像更換照片</span>
          </div>

          <Field label="姓名"><input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} /></Field>
          <Field label="地區"><input value={region} onChange={(e) => setRegion(e.target.value)} className={fieldClass} /></Field>
          <Field label="背景 / 職業"><input value={background} onChange={(e) => setBackground(e.target.value)} className={fieldClass} /></Field>
          <Field label="聯絡方式"><input value={contactMethod} onChange={(e) => setContactMethod(e.target.value)} placeholder="LINE ID / 電話 / Email" className={fieldClass} /></Field>

          {/* Status dropdown */}
          <Field label="當前狀態">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${fieldClass} cursor-pointer`}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>

          <Field label="熱度">
            <select value={heat} onChange={(e) => setHeat(e.target.value as HeatLevel)} className={`${fieldClass} cursor-pointer`}>
              {heatOptions.filter((o) => o.value !== "all").map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          {/* Referrer */}
          <Field label="推薦人 / 關係鏈">
            <select value={referrerId} onChange={(e) => setReferrerId(e.target.value)} className={`${fieldClass} cursor-pointer`}>
              <option value="">無推薦人</option>
              {otherContacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          {/* Birthday */}
          <Field label="生日 / 重要紀念日">
            <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={fieldClass} />
          </Field>

          {/* Product tags */}
          <Field label="產品關注（點選切換）">
            <div className="flex flex-wrap gap-2">
              {productOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-150 cursor-pointer ${
                    selectedTags.includes(tag)
                      ? "product-tag ring-1 ring-primary/40"
                      : "border-border text-muted-foreground bg-muted/30 hover:bg-muted/60"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </Field>

          <Field label="特殊註記"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${fieldClass} resize-none`} /></Field>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
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
