import { useState, useEffect } from "react";
import { Contact, Interaction, statusOptions, heatOptionsRaw, HeatLevel, getReferrerChain } from "@/data/contacts";
import { MentionTextarea, MentionText } from "@/components/MentionTextarea";
import { StatusBadge } from "@/components/StatusBadge";
import { AddInteractionDialog } from "@/components/AddInteractionDialog";
import { EditContactDialog } from "@/components/EditContactDialog";
import { AiInviteDialog } from "@/components/AiInviteDialog";
import {
  MapPin, Briefcase, Flame, StickyNote, ArrowLeft,
  CalendarDays, CalendarClock, Plus, Sparkles, Pencil, Package, Phone,
  Users, Cake, Bell, UserCircle, Thermometer, CheckCircle2, XCircle, Edit3, Trash2, Check, X,
} from "lucide-react";
import { statusColorMap } from "@/data/statusColors";
import { toast } from "sonner";

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
  "1month": "一個月前提醒",
  "1week": "一週前提醒",
  "3days": "三天前提醒",
  today: "當天提醒",
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
  const [editingFollowUp, setEditingFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(contact?.nextFollowUpDate ?? "");
  const [followUpNote, setFollowUpNote] = useState(contact?.nextFollowUpNote ?? "");
  const [editingInteractionIdx, setEditingInteractionIdx] = useState<number | null>(null);
  const [editInteractionDate, setEditInteractionDate] = useState("");
  const [editInteractionSummary, setEditInteractionSummary] = useState("");
  const [followUpAction, setFollowUpAction] = useState<"complete" | "cancel" | null>(null);
  const [followUpActionDate, setFollowUpActionDate] = useState("");
  const [followUpActionContent, setFollowUpActionContent] = useState("");

  useEffect(() => {
    setFollowUpDate(contact?.nextFollowUpDate ?? "");
    setFollowUpNote(contact?.nextFollowUpNote ?? "");
    setEditingFollowUp(false);
  }, [contact?.id]);

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
        <DetailRow icon={Phone} label="聯絡方式">
          {contact.contactMethod ? (
            (() => {
              const val = contact.contactMethod!;
              const urlPattern = /^https?:\/\//i;
              const socialPatterns = [
                { pattern: /(?:instagram\.com|ig:|@)/i, label: "Instagram" },
                { pattern: /(?:facebook\.com|fb\.com|fb:|fb\.me)/i, label: "Facebook" },
                { pattern: /(?:line\.me|line:|LINE ID)/i, label: "LINE" },
                { pattern: /(?:twitter\.com|x\.com)/i, label: "X / Twitter" },
                { pattern: /(?:t\.me|telegram)/i, label: "Telegram" },
                { pattern: /(?:linkedin\.com)/i, label: "LinkedIn" },
              ];
              if (urlPattern.test(val)) {
                const matched = socialPatterns.find(s => s.pattern.test(val));
                return (
                  <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {matched ? `🔗 ${matched.label}` : val}
                  </a>
                );
              }
              // Check if it contains a URL somewhere in the text
              const urlInText = val.match(/(https?:\/\/[^\s]+)/);
              if (urlInText) {
                return (
                  <span>
                    {val.replace(urlInText[0], '').trim()}{' '}
                    <a href={urlInText[0]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">🔗 連結</a>
                  </span>
                );
              }
              return val;
            })()
          ) : "尚未填寫"}
        </DetailRow>

        {/* Status display (read-only, colored) */}
        <div className="flex gap-3 items-start">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Flame className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1.5">當前狀態</p>
            <div className="flex flex-wrap gap-1.5">
              {(contact.statuses ?? []).length > 0 ? (
                (contact.statuses ?? []).map((s) => {
                  const color = statusColorMap[s] ?? { bg: "bg-muted/30", text: "text-muted-foreground", border: "border-border" };
                  return (
                    <span key={s} className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${color.bg} ${color.text} ${color.border}`}>
                      {s}
                    </span>
                  );
                })
              ) : (
                <span className="text-sm text-muted-foreground">未設定</span>
              )}
            </div>
          </div>
        </div>

        {/* Heat display (read-only) */}
        <DetailRow icon={Thermometer} label="熱度">
          <span className="text-sm">{heatLabel[contact.heat]}</span>
        </DetailRow>

        {/* Downline / referrals */}
        {(() => {
          const downlines = contacts.filter(c => c.referrerId === contact.id);
          return (
            <div className="flex gap-3 items-start">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">推薦人數</p>
                <p className="text-sm font-medium mt-0.5">{downlines.length} 人</p>
                {downlines.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {downlines.map(d => (
                      <button
                        key={d.id}
                        onClick={() => onSelectContact?.(d.id)}
                        className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-md px-2 py-0.5 hover:bg-primary/20 transition-colors"
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Referrer chain */}
        <div className="flex gap-3 items-start">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">推薦人 / 關係鏈</p>
            {referrerChain.length > 0 ? (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {[...referrerChain].reverse().map((ref, i) => (
                  <span key={ref.id} className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectContact?.(ref.id)}
                      className="text-sm text-primary hover:underline cursor-pointer font-medium"
                    >
                      {ref.name}
                      {ref.nickname && <span className="text-xs text-muted-foreground ml-0.5">({ref.nickname})</span>}
                    </button>
                    <span className="text-xs text-muted-foreground">→</span>
                  </span>
                ))}
                <span className="text-sm text-muted-foreground">{contact.name}</span>
              </div>
            ) : (
              <p className="text-sm mt-0.5 text-muted-foreground">無上級推薦人</p>
            )}
          </div>
        </div>

        {/* Birthday + reminder */}
        <DetailRow icon={Cake} label="生日">
          {contact.birthday ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span>{contact.birthday}</span>
                {(() => {
                  const parts = contact.birthday!.split("-").map(Number);
                  if (parts.length >= 2) {
                    const now = new Date();
                    const year = now.getFullYear();
                    const [m, d] = parts.length === 3 ? [parts[1], parts[2]] : [parts[0], parts[1]];
                    const birthYear = parts.length === 3 ? parts[0] : null;
                    let nextBday = new Date(year, m - 1, d);
                    if (nextBday < now) nextBday = new Date(year + 1, m - 1, d);
                    const diffMs = nextBday.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    const age = birthYear ? (now.getFullYear() - birthYear + (new Date(now.getFullYear(), m - 1, d) <= now ? 0 : -1)) : null;
                    return (
                      <>
                        {age !== null && (
                          <span className="text-xs bg-muted border border-border rounded-md px-2 py-0.5">{age} 歲</span>
                        )}
                        <span className="text-xs bg-accent/50 border border-accent rounded-md px-2 py-0.5">
                          {diffDays === 0 ? "🎂 今天生日！" : `⏳ 還有 ${diffDays} 天`}
                        </span>
                      </>
                    );
                  }
                  return null;
                })()}
              </div>
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
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2 glow-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="h-4 w-4 text-primary" />
              <span className="text-xs">下次追蹤日期</span>
            </div>
            <button
              onClick={() => setEditingFollowUp(true)}
              className="text-xs text-primary hover:underline"
            >
              {editingFollowUp ? "" : "編輯"}
            </button>
          </div>
          {editingFollowUp ? (
            <div className="space-y-2">
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <MentionTextarea
                value={followUpNote}
                onChange={setFollowUpNote}
                contacts={contacts}
                placeholder="追蹤內容備註⋯ 輸入 @ 可提及名單人物"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (onUpdateContact) {
                      onUpdateContact({ ...contact, nextFollowUpDate: followUpDate, nextFollowUpNote: followUpNote });
                    }
                    setEditingFollowUp(false);
                  }}
                  className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90"
                >
                  儲存
                </button>
                <button
                  onClick={() => {
                    setFollowUpDate(contact.nextFollowUpDate);
                    setFollowUpNote(contact.nextFollowUpNote ?? "");
                    setEditingFollowUp(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground px-3 py-1"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium font-mono tracking-wide text-primary">{contact.nextFollowUpDate}</p>
              {contact.nextFollowUpNote && (
                <MentionText text={contact.nextFollowUpNote} contacts={contacts} onSelectContact={onSelectContact} />
              )}
              {followUpAction ? (
                <div className="space-y-2 mt-2">
                  <p className="text-xs font-medium">
                    {followUpAction === "complete" ? "✅ 完成追蹤" : "❌ 取消追蹤"}
                  </p>
                  {followUpAction === "complete" && (
                    <input type="date" value={followUpActionDate} onChange={e => setFollowUpActionDate(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  )}
                  <MentionTextarea
                    value={followUpActionContent}
                    onChange={setFollowUpActionContent}
                    contacts={contacts}
                    placeholder={followUpAction === "complete" ? "完成內容摘要⋯" : "取消原因⋯"}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!followUpActionContent.trim()) {
                          toast.error(followUpAction === "complete" ? "請輸入完成內容" : "請輸入取消原因");
                          return;
                        }
                        const date = followUpAction === "complete" ? followUpActionDate : new Date().toISOString().split("T")[0];
                        const prefix = followUpAction === "complete" ? "✅ 追蹤完成" : "❌ 追蹤取消";
                        const record: Interaction = { date, summary: `${prefix}（原定 ${contact.nextFollowUpDate}）：${followUpActionContent.trim()}` };
                        if (onUpdateContact) {
                          onUpdateContact({
                            ...contact,
                            interactions: [record, ...(contact.interactions ?? [])],
                            ...(followUpAction === "complete" ? { lastContactDate: date } : {}),
                            nextFollowUpDate: "",
                            nextFollowUpNote: "",
                          });
                        }
                        setFollowUpAction(null);
                        setFollowUpActionContent("");
                      }}
                      className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-md ${followUpAction === "complete" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border border-rose-500/30"}`}
                    >
                      確認
                    </button>
                    <button onClick={() => { setFollowUpAction(null); setFollowUpActionContent(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground px-3 py-1">
                      返回
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setFollowUpAction("complete"); setFollowUpActionDate(new Date().toISOString().split("T")[0]); }}
                    className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md hover:bg-emerald-500/25 transition-colors"
                  >
                    <CheckCircle2 className="h-3 w-3" />完成
                  </button>
                  <button
                    onClick={() => setFollowUpAction("cancel")}
                    className="inline-flex items-center gap-1 text-xs bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-md hover:bg-rose-500/25 transition-colors"
                  >
                    <XCircle className="h-3 w-3" />取消
                  </button>
                </div>
              )}
            </>
          )}
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
            <div key={i} className="relative flex gap-3 group">
              <div className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
              <div className="min-w-0 flex-1">
                {editingInteractionIdx === i ? (
                  <div className="space-y-1.5">
                    <input type="date" value={editInteractionDate} onChange={e => setEditInteractionDate(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    <MentionTextarea value={editInteractionSummary} onChange={setEditInteractionSummary} contacts={contacts}
                      placeholder="互動內容⋯" rows={2} />
                    <div className="flex gap-1.5">
                      <button onClick={() => {
                        const updated = [...(contact.interactions ?? [])];
                        updated[i] = { date: editInteractionDate, summary: editInteractionSummary };
                        if (onUpdateContact) onUpdateContact({ ...contact, interactions: updated });
                        setEditingInteractionIdx(null);
                      }} className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-md">
                        <Check className="h-3 w-3" />儲存
                      </button>
                      <button onClick={() => setEditingInteractionIdx(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5">
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground font-mono">{item.date}</p>
                    <div className="text-sm mt-0.5">
                      <MentionText text={item.summary} contacts={contacts} onSelectContact={onSelectContact} />
                    </div>
                  </>
                )}
              </div>
              {editingInteractionIdx !== i && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => { setEditingInteractionIdx(i); setEditInteractionDate(item.date); setEditInteractionSummary(item.summary); }}
                    className="text-muted-foreground hover:text-primary p-0.5"><Edit3 className="h-3 w-3" /></button>
                  <button onClick={() => {
                    const updated = (contact.interactions ?? []).filter((_, idx) => idx !== i);
                    if (onUpdateContact) onUpdateContact({ ...contact, interactions: updated });
                  }} className="text-muted-foreground hover:text-destructive p-0.5"><Trash2 className="h-3 w-3" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <AddInteractionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        contactName={contact.name}
        contacts={contacts}
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
