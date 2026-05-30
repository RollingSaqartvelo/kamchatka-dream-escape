import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getGuestChat, sendGuestMessage } from "@/lib/inbox.functions";

export const Route = createFileRoute("/booking/chat/$id")({
  validateSearch: z.object({ e: z.string().optional() }),
  component: GuestChatPage,
  head: () => ({
    meta: [{ title: "Сообщения — Гостиница Полуостров" }],
  }),
});

type Msg = { id: string; sender: string; body: string; created_at: string };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function GuestChatPage() {
  const { id } = Route.useParams();
  const { e: emailParam } = Route.useSearch();

  const [booking, setBooking] = useState<any>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const getChatFn = useServerFn(getGuestChat);
  const sendMsgFn = useServerFn(sendGuestMessage);

  async function load() {
    if (!emailParam) return;
    try {
      const data = await getChatFn({ data: { bookingId: id, email: decodeURIComponent(emailParam) } });
      if (!data.booking) { setError("Бронирование не найдено"); return; }
      setBooking(data.booking);
      setMsgs(data.messages as Msg[]);
    } catch {
      setError("Не удалось загрузить чат");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id, emailParam]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // Автообновление каждые 20 сек
  useEffect(() => {
    const t = setInterval(() => void load(), 20_000);
    return () => clearInterval(t);
  }, [id, emailParam]);

  async function handleSend() {
    if (!body.trim() || !emailParam) return;
    setSending(true);
    try {
      const msg = await sendMsgFn({ data: { bookingId: id, email: decodeURIComponent(emailParam), body: body.trim() } });
      setMsgs((prev) => [...prev, msg as Msg]);
      setBody("");
    } catch {
      // показываем ошибку inline
    } finally {
      setSending(false);
    }
  }

  if (!emailParam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
        <div>
          <p className="font-serif text-2xl text-navy mb-3">Ссылка недействительна</p>
          <p className="text-sm text-zinc-500">Используйте ссылку из письма-подтверждения.</p>
          <Link to="/" className="mt-6 inline-block text-[11px] uppercase tracking-widest text-[#C9A96E]">← На главную</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-sm text-zinc-400">
        Загрузка…
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
        <div>
          <p className="font-serif text-2xl text-navy mb-3">{error || "Бронирование не найдено"}</p>
          <Link to="/" className="mt-4 inline-block text-[11px] uppercase tracking-widest text-[#C9A96E]">← На главную</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-[#1a1a2e] px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[#C9A96E] text-[10px] uppercase tracking-[3px]">Гостиница</p>
          <Link to="/" className="text-white font-serif text-xl">Полуостров</Link>
        </div>
        <p className="text-zinc-400 text-xs">Ваши сообщения</p>
      </header>

      <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 py-6 gap-4">

        {/* Booking summary */}
        <div className="bg-white border border-border rounded p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[3px] text-[#C9A96E] mb-2">Ваше бронирование</p>
          <p className="font-serif text-lg text-navy">{booking.room_name}</p>
          <p className="text-sm text-zinc-500 mt-1">
            Заезд: {fmtDate(booking.check_in)} · Выезд: {fmtDate(booking.check_out)} · {booking.nights} ноч.
          </p>
          <div className={`mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-medium ${
            booking.payment_status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}>
            {booking.payment_status === "paid" ? "✓ Оплачено" : "Ожидает оплаты"}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white border border-border rounded shadow-sm flex flex-col overflow-hidden" style={{ minHeight: 300 }}>
          <div className="border-b border-border px-4 py-3">
            <p className="text-[11px] uppercase tracking-widest text-zinc-500">Сообщения</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: 400 }}>
            {msgs.length === 0 && (
              <p className="text-center text-sm text-zinc-400 py-8">
                Напишите нам — мы ответим в ближайшее время.<br />
                <span className="text-xs">Ответ придёт на ваш email.</span>
              </p>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "guest" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded px-4 py-2.5 text-sm leading-relaxed ${
                  m.sender === "guest"
                    ? "bg-[#1a1a2e] text-white"
                    : "bg-[#f9f7f4] border border-border text-navy"
                }`}>
                  {m.sender === "admin" && (
                    <p className="text-[10px] text-[#C9A96E] uppercase tracking-widest mb-1">Гостиница Полуостров</p>
                  )}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${m.sender === "guest" ? "text-white/50" : "text-zinc-400"}`}>
                    {fmtTime(m.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void handleSend(); }}
              placeholder="Напишите ваш вопрос или пожелание… (например: нужен трансфер из аэропорта)"
              rows={3}
              className="w-full resize-none border border-border bg-cream/30 px-3 py-2 text-sm text-navy placeholder:text-zinc-400 focus:outline-none focus:border-[#C9A96E]"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[10px] text-zinc-400">Ctrl+Enter для отправки</p>
              <button
                onClick={() => void handleSend()}
                disabled={sending || !body.trim()}
                className="bg-[#1a1a2e] px-6 py-2 text-[11px] uppercase tracking-widest text-white hover:bg-[#C9A96E] disabled:opacity-40"
              >
                {sending ? "Отправка…" : "Отправить"}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400">
          Также можно позвонить: <a href="tel:+79149945757" className="text-[#C9A96E]">+7 (914) 994-57-57</a>
        </p>
      </div>
    </div>
  );
}
