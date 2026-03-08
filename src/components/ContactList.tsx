import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Contact } from "@/data/contacts";
import { StatusBadge } from "@/components/StatusBadge";

interface ContactListProps {
  contacts: Contact[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedId: string | null;
  onSelect: (c: Contact) => void;
}

export function ContactList({
  contacts,
  searchQuery,
  onSearchChange,
  selectedId,
  onSelect,
}: ContactListProps) {
  const filtered = contacts.filter(
    (c) =>
      c.name.includes(searchQuery) ||
      c.region.includes(searchQuery) ||
      c.status.includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative p-4">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜尋姓名、地區、狀態⋯"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-muted/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {filtered.map((contact) => (
          <button
            key={contact.id}
            onClick={() => onSelect(contact)}
            className={cn(
              "w-full text-left rounded-lg px-4 py-3 transition-all duration-150",
              selectedId === contact.id
                ? "bg-primary/10 border border-primary/30 glow-border"
                : "hover:bg-surface-hover border border-transparent"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">{contact.name}</span>
              <StatusBadge heat={contact.heat} label={contact.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {contact.region}
            </p>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            找不到符合的聯絡人
          </p>
        )}
      </div>
    </div>
  );
}
