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
import bgYouth from "@/assets/bg-youth.jpg";
import bgPrime from "@/assets/bg-prime.jpg";
import bgWisdom from "@/assets/bg-wisdom.jpg";

const bgImages = [bgGirl, bgYouth, bgPrime, bgWisdom];

const Index = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { contacts, loading, addContact, updateContact, deleteContact, addInteraction, importContacts, deduplicateContacts } = useContacts();
  const { theme: t } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
    });
  }, [user]);

  const [searchQuery, setSearchQuery] = useState("");
  const [heatFilter, setHeatFilter] = useState<HeatLevel | "all">("all");
  const [productFilter, setProductFilter] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const fresh = contacts.find((x) => x.id === c.id) ?? c;
    setSelectedContact(fresh);
    setShowDetail(true);
  }, [contacts]);

  const handleSelectById = useCallback((id: string) => {
    const found = contacts.find((c) => c.id === id);
    if (found) {
      setSelectedContact(found);
      setShowDetail(true);
    }
  }, [contacts]);

  const handleBack = useCallback(() => setShowDetail(false), []);

  const handleCsvImport = useCallback(async (imported: Contact[]) => {
    await importContacts(imported);
  }, [importContacts]);

  const handleCsvExport = useCallback(() => {
    const headers = ["姓名","綽號","會員編號","地區","背景","狀態","熱度","聯絡方式","生日","產品標籤","註記","最後聯絡","下次追蹤"];
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
    a.href = url; a.download = `RICH名單_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`已匯出 ${contacts.length} 筆聯絡人`);
  }, [contacts]);

  const handleAddContact = useCallback(async (contact: Contact) => {
    await addContact(contact);
  }, [addContact]);

  const handleUpdateContact = useCallback(async (updated: Contact) => {
    await updateContact(updated);
    setSelectedContact(updated);
  }, [updateContact]);

  const handleDeleteContact = useCallback(async (id: string) => {
    await deleteContact(id);
    setSelectedContact(null);
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

  const currentSelected = selectedContact ? contacts.find(c => c.id === selectedContact.id) ?? selectedContact : null;

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
          <div key={i} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === themeIndex ? 1 : 0 }}>
            <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className={`absolute inset-0 ${themes[i].authOverlay.replace('bg-gradient-to-b', 'bg-gradient-to-b')}`} />
            <div className="absolute inset-0 bg-black/60" />
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
        <div key={i} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === themeIndex ? 1 : 0, zIndex: 0 }}>
          <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
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
        <aside className={`w-full md:w-80 lg:w-96 border-r shrink-0 overflow-hidden flex-col transition-colors duration-500 ${t.sidebarBg} ${t.cardBorder} ${showDetail ? "hidden md:flex" : "flex"}`}>
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
        <main className={`flex-1 overflow-hidden ${!showDetail ? "hidden md:block" : "block"}`}>
          <ContactDetail
            contact={currentSelected}
            contacts={contacts}
            onBack={handleBack}
            onUpdateContact={handleUpdateContact}
            onSelectContact={handleSelectById}
            onDeleteContact={handleDeleteContact}
          />
        </main>
      </div>
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} onImport={handleCsvImport} existingContacts={contacts} />
      <AddContactDialog open={addContactOpen} onOpenChange={setAddContactOpen} onSave={handleAddContact} contacts={contacts} />
    </div>
  );
};

export default Index;
