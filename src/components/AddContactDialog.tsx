import { useState, useMemo, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Contact, HeatLevel, heatOptionsRaw, statusOptions, productOptions, BirthdayReminder, birthdayReminderOptions, Gender, genderOptions , todayLocal } from "@/data/contacts";
import { getStatusColor } from "@/data/statusColors";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { Search, X, UserCircle } from "lucide-react";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { PasteCardDiagnosticsDialog } from "@/components/PasteCardDiagnosticsDialog";
import { BirthdayInput } from "@/components/BirthdayInput";
import bgGirl from "@/assets/bg-girl.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgViolet from "@/assets/bg-violet.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const bgBlack = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMwMDAwMDAiLz48L3N2Zz4=";
const bgWhite = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=";

const bgImages = [bgGirl, bgViolet, bgYouth, bgPrime, bgWisdom, bgBlack, bgWhite];

const DRAFT_KEY = "addContactDraft:v1";

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
  const today = todayLocal();
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [region, setRegion] = useState("");
  const [background, setBackground] = useState("");
  const [interest, setInterest] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [heat, setHeat] = useState<HeatLevel>("cold");
  const [gender, setGender] = useState<Gender>("");
  const [notes, setNotes] = useState("");
  const [taboos, setTaboos] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [contactMethod, setContactMethod] = useState("");
  const [referrerId, setReferrerId] = useState("");
  const [birthday, setBirthday] = useState("");
  const [birthdayReminder, setBirthdayReminder] = useState<BirthdayReminder>("none");
  const [hasVoiceDraft, setHasVoiceDraft] = useState(false);
  const [referrerSearch, setReferrerSearch] = useState("");
  const [showReferrerList, setShowReferrerList] = useState(false);
  const referrerRef = useRef<HTMLDivElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);

  const filteredReferrers = useMemo(() => {
    if (!referrerSearch) return contacts.slice(0, 10);
    const q = referrerSearch.toLowerCase();
    return contacts.filter(c => c.name.toLowerCase().includes(q) || (c.nickname ?? "").toLowerCase().includes(q) || c.region.toLowerCase().includes(q)).slice(0, 10);
  }, [contacts, referrerSearch]);

  const selectedReferrer = referrerId === "self" ? { id: "self", name: userName } : contacts.find(c => c.id === referrerId);

  const reset = () => {
    setName(""); setNickname(""); setRegion(""); setBackground(""); setInterest("");
    setSelectedStatuses([]); setHeat("cold"); setGender(""); setNotes(""); setTaboos("");
    setSelectedTags([]); setContactMethod(""); setReferrerId("");
    setBirthday(""); setBirthdayReminder("none"); setReferrerSearch(""); setHasVoiceDraft(false);
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error("請輸入姓名"); return; }
    const newContact: Contact = {
      id: crypto.randomUUID(),
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      region: region.trim() || "未填寫",
      background: background.trim() || "未填寫",
      interest: interest.trim() || undefined,
      statuses: selectedStatuses,
      gender,
      heat,
      notes: notes.trim(),
      taboos: taboos.trim() || undefined,
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

  const isDirty =
    !!name || !!nickname || !!region || !!background || !!interest ||
    selectedStatuses.length > 0 || heat !== "cold" || !!gender ||
    !!notes || !!taboos || selectedTags.length > 0 || !!contactMethod ||
    !!referrerId || !!birthday || birthdayReminder !== "none" || hasVoiceDraft;

  // 視窗開啟且有未儲存內容時，關閉分頁/瀏覽器/重新整理會跳出系統確認
  useEffect(() => {
    if (!open || !isDirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [open, isDirty]);

  // 草稿自動保存：手機切 App / 切分頁回來頁面被釋放重載時不會白打
  useEffect(() => {
    if (!open) return;
    if (!isDirty) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          name, nickname, region, background, interest, selectedStatuses, heat,
          gender, notes, taboos, selectedTags, contactMethod, referrerId,
          birthday, birthdayReminder,
        }));
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [open, isDirty, name, nickname, region, background, interest, selectedStatuses, heat, gender, notes, taboos, selectedTags, contactMethod, referrerId, birthday, birthdayReminder]);

  // 開啟 dialog 時，若 localStorage 有未完成草稿則詢問是否續編
  useEffect(() => {
    if (!open) return;
    if (isDirty) return; // 已經有內容（例如語音剛填好）就不蓋掉
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      const hasContent = d && (d.name || d.nickname || d.region || d.background || d.interest || d.notes || d.taboos || d.contactMethod || d.birthday || (d.selectedStatuses?.length) || (d.selectedTags?.length) || d.referrerId);
      if (!hasContent) { localStorage.removeItem(DRAFT_KEY); return; }
      if (window.confirm("發現上次未完成的新增聯絡人草稿，要繼續編輯嗎？\n（按取消會清除草稿）")) {
        setName(d.name ?? ""); setNickname(d.nickname ?? ""); setRegion(d.region ?? "");
        setBackground(d.background ?? ""); setInterest(d.interest ?? "");
        setSelectedStatuses(d.selectedStatuses ?? []); setHeat(d.heat ?? "cold");
        setGender(d.gender ?? ""); setNotes(d.notes ?? ""); setTaboos(d.taboos ?? "");
        setSelectedTags(d.selectedTags ?? []); setContactMethod(d.contactMethod ?? "");
        setReferrerId(d.referrerId ?? ""); setBirthday(d.birthday ?? "");
        setBirthdayReminder(d.birthdayReminder ?? "none");
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch { localStorage.removeItem(DRAFT_KEY); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const requestClose = (v: boolean) => {
    if (!v && isDirty) {
      if (!window.confirm("您有尚未儲存的內容，確定要離開嗎？")) return;
    }
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="max-w-lg overflow-hidden p-0 border-0 bg-transparent !top-[calc(env(safe-area-inset-top)+2dvh)] [&>button]:!top-[calc(env(safe-area-inset-top)+0.5rem)] !translate-y-0 sm:!top-[50%] sm:!translate-y-[-50%] [&>button]:z-30 [&>button]:bg-black/50 [&>button]:rounded-full [&>button]:p-1" style={{ maxHeight: 'calc(96dvh - env(safe-area-inset-top))' }} onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="relative overflow-hidden rounded-lg h-full">
          {/* Background image */}
          <div className="absolute inset-0 overflow-hidden">
            <img src={bgImages[themeIndex]} alt="" className="absolute inset-0 w-full h-full object-cover bg-animate-drift" />
            <div className={`absolute inset-0 ${themeIndex <= 1 || themeIndex === 6 ? '' : 'bg-black/60'}`} />
          </div>
          <div className="relative z-10 p-6 pt-10 pb-20 overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(96dvh - env(safe-area-inset-top))', WebkitOverflowScrolling: 'touch' }}>
        <DialogHeader>
          <DialogTitle className="text-foreground">新增聯絡人</DialogTitle>
          <DialogDescription>手動新增或用 AI 語音一鍵建檔</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* AI Voice Input */}
          <div className="flex justify-center py-2 border-b border-border/50 mb-2">
            <VoiceInputButton
              mode="contact"
              onDraftChange={setHasVoiceDraft}
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
            <button
              type="button"
              onClick={() => setPasteOpen(true)}
              className="group ml-3 relative inline-flex items-center gap-2 rounded-full p-[1.5px] transition-transform duration-200 hover:scale-[1.04] active:scale-[0.98]"
              style={{ background: "linear-gradient(120deg, #22d3ee, #818cf8, #e879f9, #22d3ee)", backgroundSize: "300% 300%", animation: "rainbow-bg 8s linear infinite" }}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-background/85 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-foreground transition-colors group-hover:bg-background/70">
                <span className="text-base leading-none">📇</span>
                <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-transparent whitespace-nowrap">
                  數位名片診斷
                </span>
              </span>
            </button>
          </div>
          <PasteCardDiagnosticsDialog
            open={pasteOpen}
            onOpenChange={setPasteOpen}
            onParsed={(d) => {
              if (d.name) setName(d.name);
              if (d.interest) setInterest(prev => prev ? `${prev}｜${d.interest}` : d.interest!);
              if (d.notes) setNotes(prev => prev ? `${prev}\n\n${d.notes}` : d.notes);
              if (d.heat) setHeat(d.heat);
            }}
          />
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

          {/* Interest */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">興趣 / 專長</label>
            <input value={interest} onChange={e => setInterest(e.target.value)} placeholder="例：團隊經營／複製系統" className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
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
              <BirthdayInput value={birthday} onChange={setBirthday} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">生日提醒</label>
              <select value={birthdayReminder} onChange={e => setBirthdayReminder(e.target.value as BirthdayReminder)}
                className="w-full appearance-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer min-h-[38px]">
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

          {/* Taboos */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">忌諱事物</label>
            <textarea value={taboos} onChange={e => setTaboos(e.target.value)} rows={2} placeholder="此人不喜歡或忌諱的話題、食物、行為⋯"
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => requestClose(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">取消</button>
            <button onClick={handleSave} className="neon-btn-cyan">新增聯絡人</button>
          </div>
        </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
