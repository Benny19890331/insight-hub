import { useState, useRef, useEffect, useMemo } from "react";
import { Contact } from "@/data/contacts";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  contacts: Contact[];
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function MentionTextarea({ value, onChange, contacts, placeholder, rows = 2, className = "" }: MentionTextareaProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filtered = useMemo(() => {
    if (!mentionSearch) return contacts.slice(0, 10);
    const q = mentionSearch.toLowerCase();
    return contacts.filter(c => c.name.toLowerCase().includes(q) || (c.nickname ?? "").toLowerCase().includes(q)).slice(0, 10);
  }, [contacts, mentionSearch]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart ?? 0;
    onChange(val);
    setCursorPos(pos);

    // Check if @ was just typed
    const textBefore = val.slice(0, pos);
    const atIdx = textBefore.lastIndexOf("@");
    if (atIdx >= 0 && (atIdx === 0 || textBefore[atIdx - 1] === " " || textBefore[atIdx - 1] === "\n")) {
      const query = textBefore.slice(atIdx + 1);
      if (!query.includes(" ") && !query.includes("\n")) {
        setMentionSearch(query);
        setShowDropdown(true);
        return;
      }
    }
    setShowDropdown(false);
  };

  const selectContact = (c: Contact) => {
    const textBefore = value.slice(0, cursorPos);
    const atIdx = textBefore.lastIndexOf("@");
    const before = value.slice(0, atIdx);
    const after = value.slice(cursorPos);
    const newVal = `${before}@${c.name} ${after}`;
    onChange(newVal);
    setShowDropdown(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        placeholder={placeholder}
        rows={rows}
        className={`w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none ${className}`}
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg max-h-40 overflow-y-auto">
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectContact(c)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 transition-colors"
            >
              <span className="font-medium">{c.name}</span>
              {c.nickname && <span className="text-xs text-muted-foreground">({c.nickname})</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders text with @mentions as clickable links */
export function MentionText({ text, contacts, onSelectContact }: { text: string; contacts: Contact[]; onSelectContact?: (id: string) => void }) {
  const parts = text.split(/(@\S+)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const name = part.slice(1);
          const found = contacts.find(c => c.name === name);
          if (found && onSelectContact) {
            return (
              <button
                key={i}
                onClick={() => onSelectContact(found.id)}
                className="text-primary hover:underline font-medium"
              >
                {part}
              </button>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
