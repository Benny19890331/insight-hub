import { Search, Filter, Package } from "lucide-react";
import { Contact, HeatLevel, heatOptions, productOptions } from "@/data/contacts";
import { StatusBadge } from "@/components/StatusBadge";
import { getStatusColor } from "@/data/statusColors";
import { FunnelStats } from "@/components/FunnelStats";
import { useTheme } from "@/hooks/useTheme";

interface ContactListProps {
  contacts: Contact[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  heatFilter: HeatLevel | "all";
  onHeatFilterChange: (h: HeatLevel | "all") => void;
  productFilter: string;
  onProductFilterChange: (p: string) => void;
  selectedId: string | null;
  onSelect: (c: Contact) => void;
}

export function ContactList({
  contacts,
  searchQuery,
  onSearchChange,
  heatFilter,
  onHeatFilterChange,
  productFilter,
  onProductFilterChange,
  selectedId,
  onSelect,
}: ContactListProps) {
  const { theme: t } = useTheme();

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      c.name.includes(searchQuery) ||
      c.region.includes(searchQuery) ||
      (c.statuses ?? []).some((s) => s.includes(searchQuery));
    const matchesHeat = heatFilter === "all" || c.heat === heatFilter;
    const matchesProduct = !productFilter || (c.productTags ?? []).includes(productFilter);
    return matchesSearch && matchesHeat && matchesProduct;
  });

  return (
    <div className="flex flex-col h-full">
      <FunnelStats contacts={contacts} />

      {/* Search & Filters */}
      <div className="px-4 pb-3 space-y-2">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${t.mutedText}`} />
          <input
            type="text"
            placeholder="搜尋姓名、地區、狀態⋯"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm transition-all focus:outline-none focus:ring-1 ${t.inputBorder} ${t.inputBg} ${t.inputFocus} ${t.textColor}`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none ${t.mutedText}`} />
            <select
              value={heatFilter}
              onChange={(e) => onHeatFilterChange(e.target.value as HeatLevel | "all")}
              className={`w-full appearance-none rounded-lg border py-2 pl-9 pr-6 text-sm transition-all cursor-pointer focus:outline-none focus:ring-1 ${t.inputBorder} ${t.inputBg} ${t.inputFocus} ${t.textColor}`}
            >
              {heatOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs ${t.mutedText}`}>▼</div>
          </div>
          <div className="relative">
            <Package className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none ${t.mutedText}`} />
            <select
              value={productFilter}
              onChange={(e) => onProductFilterChange(e.target.value)}
              className={`w-full appearance-none rounded-lg border py-2 pl-9 pr-6 text-sm transition-all cursor-pointer focus:outline-none focus:ring-1 ${t.inputBorder} ${t.inputBg} ${t.inputFocus} ${t.textColor}`}
            >
              <option value="">全部產品</option>
              {productOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <div className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs ${t.mutedText}`}>▼</div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {filtered.map((contact) => {
          const hasDuplicate = filtered.filter(c => c.name === contact.name).length > 1;
          return (
          <button
            key={contact.id}
            onClick={() => onSelect(contact)}
            className={`w-full text-left rounded-lg px-4 py-3 transition-all duration-150 border ${
              selectedId === contact.id
                ? `${t.selectedCard} ${t.selectedBorder} ${t.selectedGlow}`
                : `${t.cardHover} border-transparent`
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold overflow-hidden ${t.accentBg} ${t.accentBorder} border ${t.accent}`}>
                {contact.avatarUrl ? (
                  <img src={contact.avatarUrl} alt={contact.name} className="h-full w-full object-cover" />
                ) : (
                  contact.name.charAt(0)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">
                    {contact.name}
                    <span className="ml-1 text-xs">{contact.heat === "loyal" ? "💎" : contact.heat === "hot" ? "🔥" : contact.heat === "warm" ? "🌤" : "🧊"}</span>
                  </span>
                  <div className="flex gap-1 shrink-0">
                    {(contact.statuses ?? []).slice(0, 2).map((s) => {
                      const color = getStatusColor(s);
                      return (
                        <span key={s} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${color.bg} ${color.text} ${color.border}`}>
                          {s}
                        </span>
                      );
                    })}
                    {(contact.statuses ?? []).length > 2 && (
                      <span className={`text-[10px] ${t.mutedText}`}>+{(contact.statuses ?? []).length - 2}</span>
                    )}
                  </div>
                </div>
                <p className={`text-xs mt-0.5 truncate ${t.mutedText}`}>
                  {contact.region}{hasDuplicate && contact.background ? ` · ${contact.background}` : ""}
                </p>
                {/* Product tags for disambiguation */}
                {hasDuplicate && (contact.productTags ?? []).length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {(contact.productTags ?? []).slice(0, 2).map(tag => (
                      <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded ${t.accentBg} ${t.accent}`}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </button>
          );
        })}
        {filtered.length === 0 && (
          <p className={`text-center text-sm py-8 ${t.mutedText}`}>
            找不到符合的聯絡人
          </p>
        )}
      </div>
    </div>
  );
}
