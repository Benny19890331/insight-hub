import { useState, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Contact, HeatLevel, heatOptionsRaw, statusOptions, productOptions, BirthdayReminder, birthdayReminderOptions, Gender, genderOptions } from "@/data/contacts";
import { getStatusColor } from "@/data/statusColors";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { Search, X, UserCircle } from "lucide-react";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import bgGirl from "@/assets/bg-girl.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const bgImages = [bgGirl, bgYouth, bgPrime, bgWisdom];

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (contact: Contact) => void;
  contacts: Contact[];
}

export function AddContactDialog({ open, onOpenChange, onSave, contacts }: AddContactDialogProps) {
  const { user } = useAuth();
  const { themeIndex } = useTheme();
  const userName = user?.user_metadata?.display_name || user?.email || "本人";
  const today = new Date().toISOString().split("T")[0];
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [region, setRegion] = useState("");
  const [background, setBackground] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [heat, setHeat] = useState<HeatLevel>("cold");
  const [gender, setGender] = useState<Gender>("");
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [contactMethod, setContactMethod] = useState("");
  const [referrerId, setReferrerId] = useState("");
  const [birthday, setBirthday] = useState("");
  const [birthdayReminder, setBirthdayReminder] = useState<BirthdayReminder>("none");
  const [referrerSearch, setReferrerSearch] = useState("");
  const [showReferrerList, setShowReferrerList] = useState(false);
  const referrerRef = useRef<HTMLDivElement>(null);

  const filteredReferrers = useMemo(() => {
    if (!referrerSearch) return contacts.slice(0, 10);
    const q = referrerSearch.toLowerCase();
    return contacts.filter(c => c.name.toLowerCase().includes(q) || (c.nickname ?? "").toLowerCase().includes(q) || c.region.toLowerCase().includes(q)).slice(0, 10);
  }, [contacts, referrerSearch]);

  const selectedReferrer = referrerId === "self" ? { id: "self", name: userName } : contacts.find(c => c.id === referrerId);

  const reset = () => {
    setName(""); setNickname(""); setRegion(""); setBackground("");
    setSelectedStatuses([]); setHeat("cold"); setGender(""); setNotes("");
    setSelectedTags([]); setContactMethod(""); setReferrerId("");
    setBirthday(""); setBirthdayReminder("none"); setReferrerSearch("");
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error("請輸入姓名"); return; }
    const newContact: Contact = {
      id: crypto.randomUUID(),
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      region: region.trim() || "未填寫",
      background: background.trim() || "未填寫",
      statuses: selectedStatuses,
      gender,
      heat,
      notes: notes.trim(),
      lastContactDate: today,
      nextFollowUpDate: today,
      interactions: [],
      productTags: selectedTags,
      contactMethod: contactMethod.trim() || undefined,
      referrerId: referrerId === "self" ? undefined : (referrerId || undefined),
      referrerName: selectedReferrer?.name ?? (referrerId === "self" ? userName : undefined),
      birthday: birthday || undefined,
      birthdayReminder,
    };
    onSave(newContact);
    reset();
    onOpenChange(false);
    toast.success(`已新增聯絡人「${newContact.name}」`);
  };

  const heatLabel: Record<string, string> = { cold: "🧊 冷", warm: "🌤 溫", hot: "🔥 熱", loyal: "💎 忠實" };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg overflow-hidden p-0 border-0 bg-transparent !top-[2dvh] !translate-y-0 sm:!top-[50%] sm:!translate-y-[-50%] [&>button]:z-30 [&>button]:bg-black/50 [&>button]:rounded-full [&>button]:p-1" style={{ maxHeight: '96dvh' }} onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="relative overflow-hidden rounded-lg h-full">
          {/* Background image */}
          <div className="absolute inset-0 overflow-hidden">
            <img src={bgImages[themeIndex]} alt="" className="absolute inset-0 w-full h-full object-cover bg-animate-drift" />
            <div className={`absolute inset-0 ${themeIndex === 0 ? '' : 'bg-black/60'}`} />
          </div>
          <div className="relative z-10 p-6 pt-10 pb-20 overflow-y-auto overscroll-contain" style={{ maxHeight: '96dvh', WebkitOverflowScrolling: 'touch' }}>
        <DialogHeader>
          <DialogTitle className="text-foreground">新增聯絡人</DialogTitle>
          <DialogDescription>手動新增或用 AI 語音一鍵建檔</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* AI Voice Input */}
          <div className="flex justify-center py-2 border-b border-border/50 mb-2">
            <VoiceInputButton
              mode="contact"
              onResult={(data: any) => {
                if (data.name) setName(data.name);
                if (data.nickname) setNickname(data.nickname);
                if (data.region) setRegion(data.region);
                if (data.background) setBackground(data.background);
                if (data.birthday) setBirthday(data.birthday);
                if (data.gender && ["male", "female", "other"].includes(data.gender)) setGender(data.gender);
                if (data.contactMethod) setContactMethod(data.contactMethod);
                if (data.products && Array.isArray(data.products)) {
                  const validProducts = data.products.filter((p: string) => productOptions.includes(p));
                  if (validProducts.length > 0) setSelectedTags(validProducts);
                }
                if (data.heat && ["cold", "warm", "hot", "loyal"].includes(data.heat)) setHeat(data.heat);
                if (data.notes) setNotes(data.notes);
              }}
            />
          </div>
          {/* Name + Nickname */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">姓名 *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="必填" className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">綽號</label>
              <input value={nickname} onChange={e => setNickname(e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">性別</label>
            <div className="flex flex-wrap gap-1.5">
              {genderOptions.filter(g => g.value !== "").map(g => (
                <button key={g.value} type="button" onClick={() => setGender(gender === g.value ? "" : g.value)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${gender === g.value ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Region + Background */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">地區</label>
              <input value={region} onChange={e => setRegion(e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">背景 / 職業</label>
              <input value={background} onChange={e => setBackground(e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
          </div>

          {/* Contact Method */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">聯絡方式</label>
            <input value={contactMethod} onChange={e => setContactMethod(e.target.value)} placeholder="電話、LINE、社群連結等" className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>

          {/* Status chips */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">狀態（可複選）</label>
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map(s => {
                const active = selectedStatuses.includes(s);
                const color = getStatusColor(s);
                return (
                  <button key={s} type="button" onClick={() => setSelectedStatuses(prev => active ? prev.filter(x => x !== s) : [...prev, s])}
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${active ? `${color.bg} ${color.text} ${color.border}` : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"}`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Heat chips */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">熱度</label>
            <div className="flex flex-wrap gap-1.5">
              {heatOptionsRaw.map(h => (
                <button key={h.value} type="button" onClick={() => setHeat(h.value)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${heat === h.value ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"}`}>
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product tags */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">產品標籤</label>
            <div className="flex flex-wrap gap-1.5">
              {productOptions.map(p => {
                const active = selectedTags.includes(p);
                return (
                  <button key={p} type="button" onClick={() => setSelectedTags(prev => active ? prev.filter(x => x !== p) : [...prev, p])}
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${active ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"}`}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Birthday */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">生日</label>
              <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 h-[38px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">生日提醒</label>
              <select value={birthdayReminder} onChange={e => setBirthdayReminder(e.target.value as BirthdayReminder)}
                className="w-full appearance-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer h-[38px]">
                {birthdayReminderOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Referrer search */}
          <div ref={referrerRef} className="relative">
            <label className="text-xs text-muted-foreground mb-1.5 block">推薦人</label>
            {selectedReferrer ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <span className="text-sm">{referrerId === "self" ? `👤 ${userName}（本人推薦）` : selectedReferrer.name}</span>
                {'nickname' in selectedReferrer && selectedReferrer.nickname && <span className="text-xs text-muted-foreground">({selectedReferrer.nickname})</span>}
                <button type="button" onClick={() => setReferrerId("")} className="ml-auto"><X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input value={referrerSearch} onChange={e => { setReferrerSearch(e.target.value); setShowReferrerList(true); }}
                  onFocus={() => setShowReferrerList(true)} placeholder="搜尋推薦人⋯"
                  className="w-full rounded-lg border border-border bg-muted/50 pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
            )}
            {showReferrerList && !selectedReferrer && (
              <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg max-h-36 overflow-y-auto">
                <button type="button" onClick={() => { setReferrerId("self"); setShowReferrerList(false); setReferrerSearch(""); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 border-b border-border">
                  <UserCircle className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{userName}</span>
                  <span className="text-xs text-muted-foreground">（本人推薦）</span>
                </button>
                {filteredReferrers.map(c => (
                  <button key={c.id} type="button" onClick={() => { setReferrerId(c.id); setShowReferrerList(false); setReferrerSearch(""); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                    {c.name} {c.nickname && <span className="text-xs text-muted-foreground">({c.nickname})</span>}
                    <span className="text-xs text-muted-foreground ml-2">{c.region}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">特殊註記</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="備註⋯"
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { reset(); onOpenChange(false); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">取消</button>
            <button onClick={handleSave} className="neon-btn-cyan">新增聯絡人</button>
          </div>
        </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
