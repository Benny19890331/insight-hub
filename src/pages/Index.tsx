import { useState, useCallback } from "react";
import { Upload, UserPlus, Download, Infinity, LogOut, Loader2 } from "lucide-react";
import { Contact, HeatLevel } from "@/data/contacts";
import { ContactList } from "@/components/ContactList";
import { ContactDetail } from "@/components/ContactDetail";
import { CsvImportDialog } from "@/components/CsvImportDialog";
import { AddContactDialog } from "@/components/AddContactDialog";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { toast } from "sonner";

const Index = () => {
  const { signOut } = useAuth();
  const { contacts, loading, addContact, updateContact, deleteContact, addInteraction, importContacts } = useContacts();

  const [searchQuery, setSearchQuery] = useState("");
  const [heatFilter, setHeatFilter] = useState<HeatLevel | "all">("all");
  const [productFilter, setProductFilter] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);

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

  const handleBack = useCallback(() => {
    setShowDetail(false);
  }, []);

  const handleCsvImport = useCallback(async (imported: Contact[]) => {
    await importContacts(imported);
  }, [importContacts]);

  const handleCsvExport = useCallback(() => {
    const headers = ["姓名","綽號","地區","背景","狀態","熱度","聯絡方式","生日","產品標籤","註記","最後聯絡","下次追蹤"];
    const heatMap: Record<string, string> = { hot: "熱", warm: "溫", cold: "冷", loyal: "忠實" };
    const rows = contacts.map(c => [
      c.name, c.nickname ?? "", c.region, c.background,
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

  // Keep selectedContact in sync with contacts array
  const currentSelected = selectedContact ? contacts.find(c => c.id === selectedContact.id) ?? selectedContact : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-4 md:px-6 h-14 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center shrink-0">
            <Infinity className="h-6 w-6" style={{ stroke: 'url(#metalGrad)', strokeWidth: 2.5 }} />
            <svg width="0" height="0">
              <defs>
                <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#b0b0b0">
                    <animate attributeName="stop-color" values="#b0b0b0;#f0e68c;#ffffff;#f0e68c;#b0b0b0" dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="33%" stopColor="#f0e68c">
                    <animate attributeName="stop-color" values="#f0e68c;#ffffff;#f0e68c;#b0b0b0;#f0e68c" dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="66%" stopColor="#ffffff">
                    <animate attributeName="stop-color" values="#ffffff;#f0e68c;#b0b0b0;#f0e68c;#ffffff" dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#f0e68c">
                    <animate attributeName="stop-color" values="#f0e68c;#b0b0b0;#f0e68c;#ffffff;#f0e68c" dur="3s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="text-sm font-semibold tracking-tight">
            <span className="text-amber-400 glow-text" style={{ textShadow: '0 0 8px rgba(251, 191, 36, 0.4)' }}>RICH系統</span>
            <span className="text-foreground ml-1.5 font-normal hidden sm:inline">名單管理</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAddContactOpen(true)} className="neon-btn-cyan">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">新增</span>
          </button>
          <button onClick={() => setCsvOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">匯入</span>
          </button>
          <button onClick={handleCsvExport} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">匯出</span>
          </button>
          <button onClick={signOut} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors" title="登出">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`w-full md:w-80 lg:w-96 border-r border-border shrink-0 overflow-hidden flex-col ${showDetail ? "hidden md:flex" : "flex"}`}>
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
      <CsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onImport={handleCsvImport}
        existingContacts={contacts}
      />
      <AddContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        onSave={handleAddContact}
        contacts={contacts}
      />
    </div>
  );
};

export default Index;
