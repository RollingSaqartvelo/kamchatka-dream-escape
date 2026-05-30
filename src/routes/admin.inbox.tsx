import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listConversations,
  getMessages,
  replyToGuest,
  setConversationStatus,
  createManualConversation,
} from "@/lib/inbox.functions";

export const Route = createFileRoute("/admin/inbox")({
  component: InboxPage,
  head: () => ({
    meta: [
      { title: "Инбокс — Админка «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Conv = {
  id: string;
  booking_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  channel: string;
  status: string;
  unread_count: number;
  last_preview: string;
  last_message_at: string;
};

type Msg = {
  id: string;
  sender: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

const CHANNEL_ICON: Record<string, string> = {
  website: "🌐",
  telegram: "✈️",
  vk: "💬",
  phone: "📞",
  email: "✉️",
  travelline: "🔄",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Открыт",
  resolved: "Закрыт",
  spam: "Спам",
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-800",
  resolved: "bg-zinc-100 text-zinc-500",
  spam: "bg-rose-100 text-rose-700",
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400_000);
  if (diffDays === 0) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "вчера";
  if (diffDays < 7) return d.toLocaleDateString("ru-RU", { weekday: "short" });
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function fmtFull(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function InboxPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");

  const bottomRef = useRef<HTMLDivElement>(null);
  const listFn = useServerFn(listConversations);
  const msgsFn = useServerFn(getMessages);
  const replyFn = useServerFn(replyToGuest);
  const statusFn = useServerFn(setConversationStatus);

  async function loadConvs() {
    const data = await listFn({});
    setConvs(data as Conv[]);
  }

  useEffect(() => {
    void loadConvs();
    const t = setInterval(() => void loadConvs(), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function openConv(conv: Conv) {
    setActive(conv);
    setLoadingMsgs(true);
    try {
      const data = await msgsFn({ data: { conversationId: conv.id } });
      setMsgs(data as Msg[]);
      setConvs((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)),
      );
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function handleReply() {
    if (!active || !reply.trim()) return;
    setSending(true);
    try {
      const msg = await replyFn({ data: { conversationId: active.id, body: reply.trim() } });
      setMsgs((prev) => [...prev, msg as Msg]);
      setReply("");
      await loadConvs();
    } catch (e) {
      toast.error("Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  }

  async function handleStatus(status: "open" | "resolved" | "spam") {
    if (!active) return;
    await statusFn({ data: { conversationId: active.id, status } });
    setActive((c) => c ? { ...c, status } : c);
    setConvs((prev) => prev.map((c) => c.id === active.id ? { ...c, status } : c));
    toast.success(`Статус: ${STATUS_LABEL[status]}`);
  }

  const filtered = convs.filter((c) =>
    filter === "all" ? true : filter === "open" ? c.status === "open" : c.status === "resolved",
  );

  const totalUnread = convs.filter((c) => c.status === "open").reduce((s, c) => s + c.unread_count, 0);

  return (
    <div className="flex h-screen flex-col overflow-hidden md:h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-xl text-navy">Инбокс</h1>
          {totalUnread > 0 && (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {totalUnread}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-navy px-4 py-2 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E]"
        >
          + Диалог
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: conversation list */}
        <div className="w-72 shrink-0 flex flex-col border-r border-border bg-background overflow-hidden">
          {/* Filter tabs */}
          <div className="flex border-b border-border">
            {(["open", "resolved", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 text-[10px] uppercase tracking-widest transition-colors ${
                  filter === f
                    ? "border-b-2 border-[#C9A96E] text-[#C9A96E]"
                    : "text-zinc-400 hover:text-navy"
                }`}
              >
                {f === "open" ? "Открытые" : f === "resolved" ? "Закрытые" : "Все"}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="p-6 text-center text-xs text-zinc-400">
                Нет диалогов
              </p>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => void openConv(c)}
                className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                  active?.id === c.id ? "bg-navy/5" : "hover:bg-cream/60"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[13px] font-medium text-navy truncate max-w-[140px]">
                    {CHANNEL_ICON[c.channel] ?? "💬"} {c.guest_name || c.guest_email}
                  </span>
                  <span className="text-[10px] text-zinc-400 shrink-0 ml-1">{fmtTime(c.last_message_at)}</span>
                </div>
                <p className="text-[11px] text-zinc-500 truncate">{c.last_preview}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${STATUS_COLOR[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                  {c.unread_count > 0 && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: thread */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-zinc-400 text-sm">
              Выберите диалог
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0 bg-background">
                <div>
                  <p className="font-medium text-navy text-sm">{active.guest_name}</p>
                  <p className="text-[11px] text-zinc-400">
                    {active.guest_email}
                    {active.guest_phone ? ` · ${active.guest_phone}` : ""}
                    {active.booking_id ? " · бронь привязана" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(["open", "resolved", "spam"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => void handleStatus(s)}
                      className={`px-3 py-1 text-[10px] uppercase tracking-widest border transition-colors ${
                        active.status === s
                          ? "bg-navy text-cream border-navy"
                          : "border-border text-zinc-500 hover:border-navy hover:text-navy"
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {loadingMsgs ? (
                  <p className="text-center text-xs text-zinc-400 py-10">Загрузка…</p>
                ) : (
                  msgs.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded px-4 py-2.5 text-sm leading-relaxed ${
                          m.sender === "admin"
                            ? "bg-navy text-cream"
                            : "bg-white border border-border text-navy"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className={`mt-1 text-[10px] ${m.sender === "admin" ? "text-cream/60" : "text-zinc-400"}`}>
                          {fmtFull(m.created_at)}
                          {m.sender === "admin" && m.read_at ? " · прочитано" : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Reply box */}
              {active.status === "open" && (
                <div className="border-t border-border p-4 shrink-0 bg-background">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void handleReply();
                    }}
                    placeholder="Введите сообщение… (Ctrl+Enter для отправки)"
                    rows={3}
                    className="w-full resize-none border border-border bg-cream/30 px-3 py-2 text-sm text-navy placeholder:text-zinc-400 focus:outline-none focus:border-[#C9A96E]"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => void handleReply()}
                      disabled={sending || !reply.trim()}
                      className="bg-navy px-6 py-2 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E] disabled:opacity-40"
                    >
                      {sending ? "Отправка…" : "Отправить"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* New conversation modal */}
      {showNewModal && (
        <NewConversationModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => { setShowNewModal(false); void loadConvs(); }}
        />
      )}
    </div>
  );
}

function NewConversationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"website" | "telegram" | "vk" | "phone" | "email">("phone");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const createFn = useServerFn(createManualConversation);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !msg) return;
    setSaving(true);
    try {
      await createFn({ data: { guestName: name, guestEmail: email, guestPhone: phone, channel, firstMessage: msg } });
      onCreated();
    } catch {
      toast.error("Не удалось создать диалог");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white p-6 shadow-xl">
        <h2 className="font-serif text-xl text-navy mb-4">Новый диалог</h2>
        <div className="space-y-3">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя гостя" className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#C9A96E]" />
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#C9A96E]" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон" className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#C9A96E]" />
          <select value={channel} onChange={(e) => setChannel(e.target.value as any)} className="w-full border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#C9A96E]">
            <option value="phone">📞 Звонок</option>
            <option value="telegram">✈️ Telegram</option>
            <option value="vk">💬 ВКонтакте</option>
            <option value="email">✉️ Email</option>
            <option value="website">🌐 Сайт</option>
          </select>
          <textarea required value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Первое сообщение / суть обращения" rows={3} className="w-full resize-none border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#C9A96E]" />
        </div>
        <div className="mt-4 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-[11px] uppercase tracking-widest text-zinc-500 border border-border hover:bg-zinc-50">Отмена</button>
          <button type="submit" disabled={saving} className="bg-navy px-6 py-2 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E] disabled:opacity-40">{saving ? "Создание…" : "Создать"}</button>
        </div>
      </form>
    </div>
  );
}
