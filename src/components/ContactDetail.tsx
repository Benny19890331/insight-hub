import { useState } from "react";
import { Contact, Interaction, statusOptions, heatOptionsRaw, HeatLevel, getReferrerChain } from "@/data/contacts";
import { StatusBadge } from "@/components/StatusBadge";
import { AddInteractionDialog } from "@/components/AddInteractionDialog";
import { EditContactDialog } from "@/components/EditContactDialog";
import { AiInviteDialog } from "@/components/AiInviteDialog";
import {
  MapPin, Briefcase, Flame, StickyNote, ArrowLeft,
  CalendarDays, CalendarClock, Plus, Sparkles, Pencil, Package, Phone,
  Users, Cake, Bell, UserCircle, Thermometer,
} from "lucide-react";
import { statusColorMap } from "@/data/statusColors";

interface ContactDetailProps {
  contact: Contact | null;
  contacts?: Contact[];
  onBack?: () => void;
  onUpdateContact?: (updated: Contact) => void;
  onSelectContact?: (id: string) => void;
}

const heatLabel: Record<string, string> = {
  cold: "🧊 冷",
  warm: "🌤 溫",
  hot: "🔥 熱",
  loyal: "💎 忠實",
};

const reminderLabel: Record<string, string> = {
  none: "不提醒",
  "1month": "一個月前",
  "1week": "一週前",
  "3days": "三天前",
  today: "當天",
};

function DetailRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export function ContactDetail({ contact, contacts = [], onBack, onUpdateContact, onSelectContact }: ContactDetailProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  if (!contact) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        <div className="text-center space-y-2">
          <div className="text-4xl opacity-30">👈</div>
          <p>選擇左側聯絡人以檢視詳細資料</p>
        </div>
      </div>
    );
  }

  const handleAddInteraction = (interaction: Interaction) => {
    if (onUpdateContact) {
      onUpdateContact({
        ...contact,
        interactions: [interaction, ...(contact.interactions ?? [])],
        lastContactDate: interaction.date > contact.lastContactDate ? interaction.date : contact.lastContactDate,
      });
    }
  };

  const handleEditSave = (updated: Contact) => {
    if (onUpdateContact) {
      onUpdateContact(updated);
    }
  };

  const referrerChain = getReferrerChain(contact, contacts, 3);

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors md:hidden">
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </button>
      )}

      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xl font-bold glow-border shrink-0 overflow-hidden">
            {contact.avatarUrl ? (
              <img src={contact.avatarUrl} alt={contact.name} className="h-full w-full object-cover" />
            ) : (
              contact.name.charAt(0)
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{contact.name}</h2>
              {contact.nickname && (
                <span className="text-sm text-muted-foreground">（{contact.nickname}）</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {(contact.statuses ?? []).map((s) => {
                const color = statusColorMap[s] ?? { bg: "bg-muted/30", text: "text-muted-foreground", border: "border-border" };
                return (
                  <span key={s} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${color.bg} ${color.text} ${color.border}`}>
                    {s}
                  </span>
                );
              })}
              <span className="text-xs text-muted-foreground">{heatLabel[contact.heat]}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setAddOpen(true)} className="neon-btn-cyan">
            <Plus className="h-3.5 w-3.5" />新增互動
          </button>
          <button onClick={() => setAiOpen(true)} className="neon-btn-magenta">
            <Sparkles className="h-3.5 w-3.5" />AI 邀約
          </button>
          <button onClick={() => setEditOpen(true)} className="neon-btn-amber">
            <Pencil className="h-3.5 w-3.5" />編輯資料
          </button>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Details */}
      <div className="space-y-5">
        <DetailRow icon={UserCircle} label="綽號 / 稱呼">{contact.nickname || <span className="text-muted-foreground">尚未填寫</span>}</DetailRow>
        <DetailRow icon={MapPin} label="地區">{contact.region}</DetailRow>
        <DetailRow icon={Briefcase} label="背景 / 職業">{contact.background}</DetailRow>
        <DetailRow icon={Phone} label="聯絡方式">{contact.contactMethod || "尚未填寫"}</DetailRow>

        {/* Status as multi-select chips */}
        <div className="flex gap-3 items-start">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Flame className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1.5">當前狀態（可複選）</p>
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusToggle(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-150 cursor-pointer ${
                    (contact.statuses ?? []).includes(s)
                      ? "product-tag ring-1 ring-primary/40"
                      : "border-border text-muted-foreground bg-muted/30 hover:bg-muted/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Heat as single-select chips */}
        <div className="flex gap-3 items-start">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Thermometer className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1.5">熱度（點擊切換）</p>
            <div className="flex flex-wrap gap-1.5">
              {heatOptionsRaw.map((h) => (
                <button
                  key={h.value}
                  onClick={() => handleHeatChange(h.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-150 cursor-pointer ${
                    contact.heat === h.value
                      ? "product-tag ring-1 ring-primary/40"
                      : "border-border text-muted-foreground bg-muted/30 hover:bg-muted/60"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Referrer chain (up to 3 levels) */}
        <div className="flex gap-3 items-start">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">推薦人 / 關係鏈（上溯三階）</p>
            {referrerChain.length > 0 ? (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                <span className="text-sm text-muted-foreground">{contact.name}</span>
                {referrerChain.map((ref, i) => (
                  <span key={ref.id} className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">←</span>
                    <button
                      onClick={() => onSelectContact?.(ref.id)}
                      className="text-sm text-primary hover:underline cursor-pointer font-medium"
                    >
                      {ref.name}
                      {ref.nickname && <span className="text-xs text-muted-foreground ml-0.5">({ref.nickname})</span>}
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm mt-0.5 text-muted-foreground">無上級推薦人</p>
            )}
          </div>
        </div>

        {/* Birthday + reminder */}
        <DetailRow icon={Cake} label="生日 / 重要紀念日">
          {contact.birthday ? (
            <div className="flex items-center gap-2">
              <span>{contact.birthday}</span>
              {contact.birthdayReminder && contact.birthdayReminder !== "none" && (
                <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 border border-primary/20 rounded-md px-2 py-0.5">
                  <Bell className="h-3 w-3" />
                  {reminderLabel[contact.birthdayReminder]}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">尚未填寫</span>
          )}
        </DetailRow>

        {/* Product tags */}
        <div className="flex gap-3 items-start">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">產品關注 / 消費標籤</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {(contact.productTags ?? []).map((tag) => (
                <span key={tag} className="product-tag">{tag}</span>
              ))}
              {(contact.productTags ?? []).length === 0 && (
                <span className="text-sm text-muted-foreground">尚無標籤</span>
              )}
            </div>
          </div>
        </div>

        <DetailRow icon={StickyNote} label="特殊註記">{contact.notes}</DetailRow>
      </div>

      <div className="h-px bg-border" />

      {/* Date Tracking */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-xs">最後聯絡日期</span>
          </div>
          <p className="text-sm font-medium font-mono tracking-wide">{contact.lastContactDate}</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-1 glow-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="h-4 w-4 text-primary" />
            <span className="text-xs">下次追蹤日期</span>
          </div>
          <p className="text-sm font-medium font-mono tracking-wide text-primary">{contact.nextFollowUpDate}</p>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Interaction Timeline */}
      <div>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          歷史互動紀錄
        </h3>
        <div className="relative pl-5 space-y-4">
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
          {(contact.interactions ?? []).map((item, i) => (
            <div key={i} className="relative flex gap-3">
              <div className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-mono">{item.date}</p>
                <p className="text-sm mt-0.5">{item.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <AddInteractionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        contactName={contact.name}
        onSave={handleAddInteraction}
      />
      <EditContactDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contact={contact}
        contacts={contacts}
        onSave={handleEditSave}
      />
      <AiInviteDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        contact={contact}
      />
    </div>
  );
}
