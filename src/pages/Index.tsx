import { useState, useCallback } from "react";
import { Upload, Users } from "lucide-react";
import { mockContacts, Contact, HeatLevel } from "@/data/contacts";
import { ContactList } from "@/components/ContactList";
import { ContactDetail } from "@/components/ContactDetail";
import { toast } from "sonner";

const Index = () => {
  const [contacts] = useState<Contact[]>(mockContacts);
  const [searchQuery, setSearchQuery] = useState("");
  const [heatFilter, setHeatFilter] = useState<HeatLevel | "all">("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleSelect = useCallback((c: Contact) => {
    // Always use the latest version from state
    const fresh = contacts.find((x) => x.id === c.id) ?? c;
    setSelectedContact(fresh);
    setShowDetail(true);
  }, [contacts]);

  const handleBack = useCallback(() => {
    setShowDetail(false);
  }, []);

  const handleCsvImport = useCallback(() => {
    toast.info("CSV 匯入功能即將推出", {
      description: "此功能正在開發中，敬請期待。",
    });
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-border px-4 md:px-6 h-14 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-sm font-semibold tracking-tight">
            <span className="text-primary glow-text">CRM</span>
            <span className="text-muted-foreground ml-1.5 font-normal hidden sm:inline">
              名單管理
            </span>
          </h1>
        </div>

        <button
          onClick={handleCsvImport}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">匯入 CSV</span>
          <span className="sm:hidden">匯入</span>
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`w-full md:w-80 lg:w-96 border-r border-border shrink-0 overflow-hidden flex-col ${
            showDetail ? "hidden md:flex" : "flex"
          }`}
        >
          <ContactList
            contacts={contacts}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            heatFilter={heatFilter}
            onHeatFilterChange={setHeatFilter}
            selectedId={selectedContact?.id ?? null}
            onSelect={handleSelect}
          />
        </aside>

        <main
          className={`flex-1 overflow-hidden ${
            !showDetail ? "hidden md:block" : "block"
          }`}
        >
          <ContactDetail contact={selectedContact} onBack={handleBack} />
        </main>
      </div>
    </div>
  );
};

export default Index;
