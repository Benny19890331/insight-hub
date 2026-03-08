import { useState, useCallback } from "react";
import { Upload, Users } from "lucide-react";
import { mockContacts, Contact, HeatLevel } from "@/data/contacts";
import { ContactList } from "@/components/ContactList";
import { ContactDetail } from "@/components/ContactDetail";
import { CsvImportDialog } from "@/components/CsvImportDialog";
import { toast } from "sonner";

const Index = () => {
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [searchQuery, setSearchQuery] = useState("");
  const [heatFilter, setHeatFilter] = useState<HeatLevel | "all">("all");
  const [productFilter, setProductFilter] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

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

  const handleCsvImport = useCallback((imported: Contact[]) => {
    setContacts((prev) => [...prev, ...imported]);
  }, []);

  const handleUpdateContact = useCallback((updated: Contact) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedContact(updated);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-4 md:px-6 h-14 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-sm font-semibold tracking-tight">
            <span className="text-amber-400 glow-text" style={{ textShadow: '0 0 8px rgba(251, 191, 36, 0.4)' }}>RICH</span>
            <span className="text-muted-foreground ml-1.5 font-normal hidden sm:inline">系統名單管理</span>
          </h1>
        </div>
        <button onClick={() => setCsvOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">匯入 CSV</span>
          <span className="sm:hidden">匯入</span>
        </button>
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
            selectedId={selectedContact?.id ?? null}
            onSelect={handleSelect}
          />
        </aside>
        <main className={`flex-1 overflow-hidden ${!showDetail ? "hidden md:block" : "block"}`}>
          <ContactDetail
            contact={selectedContact}
            contacts={contacts}
            onBack={handleBack}
            onUpdateContact={handleUpdateContact}
            onSelectContact={handleSelectById}
          />
        </main>
      </div>
    </div>
  );
};

export default Index;
