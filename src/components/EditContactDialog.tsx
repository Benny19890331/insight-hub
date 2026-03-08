import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Contact, HeatLevel, heatOptions, heatOptionsRaw, productOptions, statusOptions, birthdayReminderOptions, BirthdayReminder, Gender, genderOptions } from "@/data/contacts";
import { getStatusColor } from "@/data/statusColors";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, themes } from "@/hooks/useTheme";
import { toast } from "sonner";
import { Camera, Search, X, UserCircle } from "lucide-react";
import bgGirl from "@/assets/bg-girl.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const bgImages = [bgGirl, bgYouth, bgPrime, bgWisdom];

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  onSave: (updated: Contact) => void;
  contacts?: Contact[];
}

export function EditContactDialog({ open, onOpenChange, contact, onSave, contacts = [] }: EditContactDialogProps) {
  const { user } = useAuth();
  const { theme: t, themeIndex } = useTheme();
  const userName = user?.user_metadata?.display_name || user?.email || "本人";
  const [name, setName] = useState(contact.name);
  const [nickname, setNickname] = useState(contact.nickname ?? "");
  const [memberId, setMemberId] = useState(contact.memberId ?? "");
  const [region, setRegion] = useState(contact.region);
  const [background, setBackground] = useState(contact.background);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(contact.statuses ?? []);
  const [heat, setHeat] = useState<HeatLevel>(contact.heat);
  const [notes, setNotes] = useState(contact.notes);
  const [selectedTags, setSelectedTags] = useState<string[]>(contact.productTags ?? []);
  const [contactMethod, setContactMethod] = useState(contact.contactMethod ?? "");
  const [avatarUrl, setAvatarUrl] = useState(contact.avatarUrl ?? "");
  const [referrerId, setReferrerId] = useState(contact.referrerId ?? "");
  const [birthday, setBirthday] = useState(contact.birthday ?? "");
  const [birthdayReminder, setBirthdayReminder] = useState<BirthdayReminder>(contact.birthdayReminder ?? "none");
  const [gender, setGender] = useState<Gender>(contact.gender ?? "");
  const [referrerSearch, setReferrerSearch] = useState("");
  const [referrerOpen, setReferrerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referrerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setName(contact.name);
    setNickname(contact.nickname ?? "");
    setMemberId(contact.memberId ?? "");
    setRegion(contact.region);
    setBackground(contact.background);
    setSelectedStatuses(contact.statuses ?? []);
    setHeat(contact.heat);
    setNotes(contact.notes);
    setSelectedTags(contact.productTags ?? []);
    setContactMethod(contact.contactMethod ?? "");
    setAvatarUrl(contact.avatarUrl ?? "");
    setReferrerId(contact.referrerId ?? "");
    setBirthday(contact.birthday ?? "");
    setBirthdayReminder(contact.birthdayReminder ?? "none");
    setGender(contact.gender ?? "");
    setReferrerSearch("");
  }, [contact]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (referrerRef.current && !referrerRef.current.contains(e.target as Node)) {
        setReferrerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const otherContacts = contacts.filter((c) => c.id !== contact.id);
  const filteredReferrers = useMemo(() => {
    if (!referrerSearch) return otherContacts;
    const q = referrerSearch.toLowerCase();
    return otherContacts.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.nickname ?? "").toLowerCase().includes(q) ||
      c.region.toLowerCase().includes(q)
    );
  }, [otherContacts, referrerSearch]);

  const selectedReferrer = referrerId === "self" ? { id: "self", name: userName } as any : contacts.find((c) => c.id === referrerId);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleStatus = (s: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
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

  const handleSave = () => {
    const updated: Contact = {
      ...contact,
      name,
      nickname: nickname || undefined,
      memberId: memberId || undefined,
      region,
      background,
      statuses: selectedStatuses,
      gender,
      heat,
      notes,
      productTags: selectedTags,
      contactMethod,
      avatarUrl,
      referrerId: referrerId === "self" ? undefined : (referrerId || undefined),
      referrerName: referrerId === "self" ? userName : (selectedReferrer?.name ?? undefined),
      birthday: birthday || undefined,
      birthdayReminder,
    };
    onSave(updated);
    onOpenChange(false);
    toast.success("資料已更新");
  };

  const fieldClass = "w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden p-0 border-0 bg-transparent">
        <div className="relative overflow-hidden rounded-lg">
          {/* Background image */}
          <div className="absolute inset-0 overflow-hidden">
            <img src={bgImages[themeIndex]} alt="" className="absolute inset-0 w-full h-full object-cover bg-animate-drift" />
            <div className="absolute inset-0 bg-black/60" />
          </div>
          <div className="relative z-10 p-6 overflow-y-auto max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className={t.authCardText}>編輯客戶資料</DialogTitle>
          <DialogDescription className={t.mutedText}>修改 {contact.name} 的資訊</DialogDescription>
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
          <Field label="綽號 / 稱呼"><input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="例：宏哥、美玲姐" className={fieldClass} /></Field>
          <Field label="會員編號"><input value={memberId} onChange={(e) => setMemberId(e.target.value)} placeholder="例：1596887-001" className={fieldClass} /></Field>
          <Field label="地區"><input value={region} onChange={(e) => setRegion(e.target.value)} className={fieldClass} /></Field>
          <Field label="背景 / 職業"><input value={background} onChange={(e) => setBackground(e.target.value)} className={fieldClass} /></Field>
          <Field label="聯絡方式"><input value={contactMethod} onChange={(e) => setContactMethod(e.target.value)} placeholder="LINE ID / 電話 / Email" className={fieldClass} /></Field>

          {/* Gender */}
          <Field label="性別">
            <div className="flex flex-wrap gap-2">
              {genderOptions.filter(g => g.value !== "").map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGender(gender === g.value ? "" : g.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-150 cursor-pointer ${
                    gender === g.value
                      ? "product-tag ring-1 ring-primary/40"
                      : "border-border text-muted-foreground bg-muted/30 hover:bg-muted/60"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Status as multi-select chips */}
          <Field label="當前狀態（可複選）">
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((s) => {
                const color = getStatusColor(s);
                const isSelected = selectedStatuses.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatus(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? `${color.bg} ${color.text} ${color.border} ring-1 ring-current/20`
                        : "border-border text-muted-foreground bg-muted/30 hover:bg-muted/60"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Heat as single-select chips */}
          <Field label="熱度（點擊切換）">
            <div className="flex flex-wrap gap-2">
              {heatOptionsRaw.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => setHeat(h.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-150 cursor-pointer ${
                    heat === h.value
                      ? "product-tag ring-1 ring-primary/40"
                      : "border-border text-muted-foreground bg-muted/30 hover:bg-muted/60"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Searchable referrer */}
          <Field label="推薦人 / 關係鏈">
            <div className="relative" ref={referrerRef}>
              {referrerId ? (
                <div className="flex items-center gap-2">
                  <span className={`${fieldClass} flex-1`}>{referrerId === "self" ? `👤 ${userName}（本人推薦）` : (selectedReferrer?.name ?? "未知")}</span>
                  <button
                    type="button"
                    onClick={() => { setReferrerId(""); setReferrerSearch(""); }}
                    className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      value={referrerSearch}
                      onChange={(e) => { setReferrerSearch(e.target.value); setReferrerOpen(true); }}
                      onFocus={() => setReferrerOpen(true)}
                      placeholder="搜尋姓名或綽號..."
                      className={`${fieldClass} pl-9`}
                    />
                  </div>
                  {referrerOpen && (
                    <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                      <button
                        type="button"
                        onClick={() => { setReferrerId("self"); setReferrerOpen(false); setReferrerSearch(""); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-2 border-b border-border"
                      >
                        <UserCircle className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium">{userName}</span>
                        <span className="text-xs text-muted-foreground">（本人推薦）</span>
                      </button>
                      {filteredReferrers.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">找不到符合的聯絡人</div>
                      ) : (
                        filteredReferrers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setReferrerId(c.id); setReferrerOpen(false); setReferrerSearch(""); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <span className="font-medium">{c.name}</span>
                            {c.nickname && <span className="text-xs text-muted-foreground">（{c.nickname}）</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </Field>

          {/* Birthday + reminder */}
          <Field label="生日 / 重要紀念日">
            <div className="flex gap-2">
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={`${fieldClass} flex-1`} />
              <select
                value={birthdayReminder}
                onChange={(e) => setBirthdayReminder(e.target.value as BirthdayReminder)}
                className={`${fieldClass} w-auto min-w-[120px] cursor-pointer`}
              >
                {birthdayReminderOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
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
