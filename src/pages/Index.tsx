import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, UserPlus, Download, Infinity, LogOut, Loader2, DatabaseZap, ArrowDownUp } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { generateSeedContacts } from "@/data/seedContacts";
import { Contact, HeatLevel } from "@/data/contacts";
import { ContactList } from "@/components/ContactList";
import { ContactDetail } from "@/components/ContactDetail";
import { CsvImportDialog } from "@/components/CsvImportDialog";
import { AddContactDialog } from "@/components/AddContactDialog";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useTheme, ThemeSwitcher, FontSizeSwitcher, themes } from "@/hooks/useTheme";
import { toast } from "sonner";
import bgGirl from "@/assets/bg-girl.jpg";
import bgViolet from "@/assets/bg-violet.jpg";
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const bgImages = [bgGirl, bgViolet, bgYouth, bgPrime, bgWisdom];

const Index = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { contacts, loading, addContact, updateContact, deleteContact, addInteraction, updateInteraction, deleteInteraction, importContacts, deduplicateContacts } = useContacts();
  const { theme: t } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);
  const [requireProfileCompletion, setRequireProfileCompletion] = useState(false);
  const [missingDisplayName, setMissingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [memberCodeInput, setMemberCodeInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [nameError, setNameError] = useState("");
  const [memberCodeError, setMemberCodeError] = useState("");

  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata as any;
    const provider = user.app_metadata?.provider;
    const isOAuth = provider && provider !== "email";
    const currentMemberCode = meta?.member_code;
    const hasMemberCode = currentMemberCode && String(currentMemberCode).trim();
    const currentDisplayName = meta?.display_name;
    const displayNameStr = currentDisplayName ? String(currentDisplayName).trim() : "";
    const nameNeedsUpdate = displayNameStr.length === 0 || displayNameStr.length > 20;
    setDisplayNameInput(displayNameStr.length <= 20 ? displayNameStr : "");
    setMemberCodeInput(hasMemberCode ? String(currentMemberCode).trim() : "");
    // OAuth users: always show name field; require update if name empty or >20 chars, or missing member_code
    if (isOAuth && (!hasMemberCode || nameNeedsUpdate)) {
      setMissingDisplayName(true);
      setRequireProfileCompletion(true);
    } else if (!hasMemberCode) {
      setMissingDisplayName(true);
      setRequireProfileCompletion(true);
    } else {
      setRequireProfileCompletion(false);
    }
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
    });
  }, [user]);

  const [searchQuery, setSearchQuery] = useState("");
  const [heatFilter, setHeatFilter] = useState<HeatLevel | "all">("all");
  const [productFilter, setProductFilter] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [swipeHint, setSwipeHint] = useState(false);

  const handleInfinityTap = useCallback(() => {
    if (!isAdmin) return;
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 10) {
      tapCountRef.current = 0;
      navigate("/admin");
      return;
    }
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 3000);
  }, [navigate, isAdmin]);

  const handleSelect = useCallback((c: Contact) => {
    setSelectedContactId(c.id);
    setShowDetail(true);
  }, []);

  const handleSelectById = useCallback((id: string) => {
    const found = contacts.some((c) => c.id === id);
    if (found) {
      setSelectedContactId(id);
      setShowDetail(true);
    }
  }, [contacts]);

  const handleBack = useCallback(() => setShowDetail(false), []);

  const handleDetailTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
    setSwipeHint(false);
  }, []);

  const handleDetailTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartXRef.current == null || touchStartYRef.current == null) return;
    const currentX = e.touches[0]?.clientX ?? touchStartXRef.current;
    const currentY = e.touches[0]?.clientY ?? touchStartYRef.current;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = Math.abs(currentY - touchStartYRef.current);
    setSwipeHint(deltaX > 80 && deltaY < 35);
  }, []);

  const handleDetailTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartXRef.current == null || touchStartYRef.current == null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const deltaX = endX - touchStartXRef.current;
    const deltaY = Math.abs(endY - touchStartYRef.current);
    if (deltaX > 130 && deltaY < 35) {
      setShowDetail(false);
    }
    setSwipeHint(false);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  }, []);

  const handleCsvImport = useCallback(async (imported: Contact[]) => {
    await importContacts(imported);
  }, [importContacts]);

  const handleCsvExport = useCallback(() => {
    const headers = ["姓名","綽號","會員編號","地區","背景","狀態","熱度","聯絡方式","生日","產品標籤","註記","最後聯絡","下次邀約\\課程時間"];
    const heatMap: Record<string, string> = { hot: "熱", warm: "溫", cold: "冷", loyal: "忠實" };
    const rows = contacts.map(c => [
      c.name, c.nickname ?? "", c.memberId ?? "", c.region, c.background,
      (c.statuses ?? []).join("、"), heatMap[c.heat] ?? c.heat,
      c.contactMethod ?? "", c.birthday ?? "",
      (c.productTags ?? []).join("、"), c.notes,
      c.lastContactDate, c.nextFollowUpDate,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const twDate = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replace(/\//g, "-");
    a.download = `RICH名單_${twDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`已匯出 ${contacts.length} 筆聯絡人`);
  }, [contacts]);

  const handleAddContact = useCallback(async (contact: Contact) => {
    await addContact(contact);
  }, [addContact]);

  const handleUpdateContact = useCallback(async (updated: Contact) => {
    await updateContact(updated);
  }, [updateContact]);

  const handleDeleteContact = useCallback(async (id: string) => {
    await deleteContact(id);
    setSelectedContactId(null);
    setShowDetail(false);
  }, [deleteContact]);

  const handleAddInteraction = useCallback(async (contactId: string, interaction: { date: string; summary: string }) => {
    await addInteraction(contactId, interaction);
  }, [addInteraction]);

  const handleSeedData = useCallback(async () => {
    if (!isAdmin) return;
    const seedData = generateSeedContacts();
    await importContacts(seedData);
    toast.success(`已生成 ${seedData.length} 筆虛擬名單`);
  }, [importContacts, isAdmin]);


  const handleSaveProfile = useCallback(async () => {
    // 重置錯誤訊息
    setNameError("");
    setMemberCodeError("");
    
    let hasError = false;
    if (!displayNameInput.trim()) {
      setNameError("請填寫您的姓名，這是必要欄位");
      hasError = true;
    }
    if (!memberCodeInput.trim()) {
      setMemberCodeError("請填寫會員編號（例如：A001），這是必要欄位");
      hasError = true;
    }
    if (hasError) return;
    
    setSavingProfile(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.updateUser({
        data: {
          ...(user?.user_metadata || {}),
          display_name: displayNameInput.trim(),
          member_code: memberCodeInput.trim(),
        },
      });
      if (error) throw error;
      // Also update profiles table
      await supabase.from("profiles").update({
        display_name: displayNameInput.trim(),
        member_code: memberCodeInput.trim(),
      }).eq("id", user?.id);
      toast.success("資料已更新");
      setRequireProfileCompletion(false);
    } catch (err: any) {
      toast.error(err?.message || "更新失敗，請稍後再試");
    }
    setSavingProfile(false);
  }, [displayNameInput, memberCodeInput, user]);

  const currentSelected = selectedContactId ? contacts.find((c) => c.id === selectedContactId) ?? null : null;

  // Themed button styles
  const primaryBtnStyle: React.CSSProperties = {
    color: t.btnPrimary.color,
    border: `1px solid ${t.btnPrimary.border}`,
    background: t.btnPrimary.bg,
    boxShadow: `0 0 12px -2px ${t.btnPrimary.shadow}, inset 0 0 10px -6px ${t.btnPrimary.shadow}`,
  };
  const secondaryBtnStyle: React.CSSProperties = {
    color: t.btnSecondary.color,
    border: `1px solid ${t.btnSecondary.border}`,
    background: t.btnSecondary.bg,
    boxShadow: `0 0 10px -2px ${t.btnSecondary.shadow}, inset 0 0 8px -6px ${t.btnSecondary.shadow}`,
  };

  const { themeIndex } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {bgImages.map((img, i) => (
          <div key={i} className="absolute inset-0 transition-opacity duration-700 overflow-hidden" style={{ opacity: i === themeIndex ? 1 : 0 }}>
            <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover bg-animate-drift" />
            <div className={`absolute inset-0 ${themes[i].authOverlay.replace('bg-gradient-to-b', 'bg-gradient-to-b')}`} />
            <div className="absolute inset-0 bg-black/50" />
          </div>
        ))}
        <Loader2 className={`h-8 w-8 animate-spin ${t.accent} relative z-10`} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      {/* Background images */}
      {bgImages.map((img, i) => (
        <div key={i} className="absolute inset-0 transition-opacity duration-700 overflow-hidden" style={{ opacity: i === themeIndex ? 1 : 0, zIndex: 0 }}>
          <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover bg-animate-drift" />
          <div className={`absolute inset-0 ${i <= 1 ? 'bg-black/5' : 'bg-black/50'}`} />
        </div>
      ))}
      <header className={`flex items-center justify-between border-b px-4 md:px-6 h-14 shrink-0 transition-colors duration-500 relative z-10 ${t.headerBg} ${t.headerBorder}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center shrink-0 cursor-pointer" onClick={handleInfinityTap}>
            <Infinity className="h-6 w-6" style={{ stroke: 'url(#metalGrad)', strokeWidth: 2.5, filter: `drop-shadow(0 0 4px ${t.titleGlow})` }} />
            <svg width="0" height="0">
              <defs>
                <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={t.titleColor}>
                    <animate attributeName="stop-color" values={`${t.titleColor};#ffffff;${t.titleColor};#f0e68c;${t.titleColor}`} dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="33%" stopColor="#ffffff">
                    <animate attributeName="stop-color" values={`#ffffff;${t.titleColor};#f0e68c;#ffffff;#ffffff`} dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="66%" stopColor="#f0e68c">
                    <animate attributeName="stop-color" values={`#f0e68c;#ffffff;${t.titleColor};#f0e68c;#f0e68c`} dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor={t.titleColor}>
                    <animate attributeName="stop-color" values={`${t.titleColor};#f0e68c;#ffffff;${t.titleColor};${t.titleColor}`} dur="3s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="text-sm font-semibold tracking-tight">
            <span style={{ color: t.titleColor, textShadow: `0 0 8px ${t.titleGlow}` }}>RICH系統</span>
            <span className={`ml-1.5 font-normal inline ${t.mutedText}`}>名單管理</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <FontSizeSwitcher />
          <button
            onClick={() => setAddContactOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer"
            style={primaryBtnStyle}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = t.btnPrimary.hoverBg; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = t.btnPrimary.bg; }}
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">新增</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer"
                style={secondaryBtnStyle}
              >
                <ArrowDownUp className="h-4 w-4" />
                <span className="hidden sm:inline">匯入/出</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => setCsvOpen(true)} className="gap-2 cursor-pointer">
                <Download className="h-4 w-4" /> 匯入 CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCsvExport} className="gap-2 cursor-pointer">
                <Upload className="h-4 w-4" /> 匯出 CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={signOut} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${t.btnOutline}`} title="登出">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        <aside className={`w-full md:w-80 lg:w-96 border-r shrink-0 overflow-hidden flex-col transition-colors duration-500 bg-transparent ${t.cardBorder} ${showDetail ? "hidden md:flex" : "flex"}`}>
          <ContactList
            contacts={contacts}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            heatFilter={heatFilter}
            onHeatFilterChange={setHeatFilter}
            productFilter={productFilter}
            onProductFilterChange={setProductFilter}
            selectedId={currentSelected?.id ?? null}
            onSelect={handleSelect}
            onDeduplicate={deduplicateContacts}
          />
        </aside>
        <main className={`flex-1 overflow-hidden ${!showDetail ? "hidden md:block" : "block"}`} onTouchStart={handleDetailTouchStart} onTouchMove={handleDetailTouchMove} onTouchEnd={handleDetailTouchEnd}>
          {swipeHint && showDetail && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 text-[11px] px-2 py-1 rounded-full bg-black/50 text-white/90 backdrop-blur-sm animate-pulse">
              再往右滑即可返回
            </div>
          )}
          <ContactDetail
            key={currentSelected?.id ?? "empty-contact"}
            contact={currentSelected}
            contacts={contacts}
            onBack={handleBack}
            onUpdateContact={handleUpdateContact}
            onSelectContact={handleSelectById}
            onDeleteContact={handleDeleteContact}
            onAddInteraction={handleAddInteraction}
            onUpdateInteraction={updateInteraction}
            onDeleteInteraction={deleteInteraction}
          />
        </main>
      </div>

      {requireProfileCompletion && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center px-4 pt-[max(2dvh,env(safe-area-inset-top))] pb-20">
            <div className={`w-full max-w-sm rounded-xl border-2 p-6 space-y-4 max-h-[96dvh] overflow-y-auto overscroll-contain ${t.authCard}`}>
            <div className="text-center space-y-2">
              <h3 className={`text-lg font-bold ${t.authCardText}`}>請先完善個人資料</h3>
              <p className={`text-sm ${t.authSubtext}`}>請填寫以下資料才能繼續使用系統</p>
            </div>

            <div className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${t.authInput}`}>
              <p className={`font-semibold ${t.authCardText}`}>請先填寫姓名，再填會員編號。</p>
              <p className={t.authSubtext}>若您是使用 Google / Apple 登入，也需要補上真實姓名，方便後台辨識。</p>
            </div>
            
            {/* 姓名欄位 */}
            <div className="space-y-1.5">
              <label className={`text-sm font-semibold block ${t.authCardText}`}>
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                value={displayNameInput}
                onChange={(e) => {
                  setDisplayNameInput(e.target.value);
                  if (nameError) setNameError("");
                }}
                placeholder="請輸入您的真實姓名"
                className={`w-full rounded-lg border-2 px-4 py-3 text-base backdrop-blur-sm focus:outline-none focus:ring-2 transition-all ${
                  nameError 
                    ? "border-red-500 bg-red-50/10 focus:ring-red-500/50" 
                    : `border-current/20 ${t.authInput} focus:ring-current/30`
                }`}
                autoFocus
              />
              {nameError && (
                <div className="flex items-start gap-1.5 text-red-500 text-sm mt-1.5 animate-in fade-in slide-in-from-top-1">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{nameError}</span>
                </div>
              )}
            </div>
            
            {/* 會員編號欄位 */}
            <div className="space-y-1.5">
              <label className={`text-sm font-semibold block ${t.authCardText}`}>
                會員編號 <span className="text-red-500">*</span>
              </label>
              <input
                value={memberCodeInput}
                onChange={(e) => {
                  setMemberCodeInput(e.target.value);
                  if (memberCodeError) setMemberCodeError("");
                }}
                placeholder="例如：A001"
                className={`w-full rounded-lg border-2 px-4 py-3 text-base backdrop-blur-sm focus:outline-none focus:ring-2 transition-all ${
                  memberCodeError 
                    ? "border-red-500 bg-red-50/10 focus:ring-red-500/50" 
                    : `border-current/20 ${t.authInput} focus:ring-current/30`
                }`}
              />
              {memberCodeError && (
                <div className="flex items-start gap-1.5 text-red-500 text-sm mt-1.5 animate-in fade-in slide-in-from-top-1">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{memberCodeError}</span>
                </div>
              )}
            </div>
            
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-base font-bold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50 mt-2"
                style={primaryBtnStyle}
              >
                {savingProfile && <Loader2 className="h-5 w-5 animate-spin" />}
                儲存並繼續
              </button>
            </div>
          </div>
        </div>
      )}

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} onImport={handleCsvImport} existingContacts={contacts} />
      <AddContactDialog open={addContactOpen} onOpenChange={setAddContactOpen} onSave={handleAddContact} contacts={contacts} />
    </div>
  );
};

export default Index;
