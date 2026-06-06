import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { markBookingEnteredInTl } from "@/lib/booking.functions";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotificationsPage,
  head: () => ({
    meta: [
      { title: "Уведомления — Админка «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Item = {
  id: string;
  booking_number: string;
  first_name: string;
  last_name: string;
  room_name: string;
  check_in: string;
  check_out: string;
  total_price: number;
  payment_status: string;
  created_at: string;
  paid_at: string | null;
  source: string | null;
  tl_entered_at: string | null;
};

function AdminNotificationsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();

    // realtime: new bookings appear instantly
    const channel = supabase
      .channel("admin-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_number, first_name, last_name, room_name, check_in, check_out, total_price, payment_status, created_at, paid_at, source, tl_entered_at",
      )
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) console.error(error);
    else setItems((data as Item[]) ?? []);
    setLoading(false);
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const newBookings = items.filter((b) => b.payment_status === "pending");
  const todayPaid = items.filter(
    (b) => b.payment_status === "paid" && b.paid_at && b.paid_at.startsWith(today),
  );
  const arrivingToday = items.filter(
    (b) => b.check_in === today && b.payment_status !== "cancelled",
  );
  // Оплаченные брони с сайта, ещё не внесённые в TravelLine вручную.
  const needTlEntry = items.filter(
    (b) =>
      (b.source ?? "") === "website" &&
      b.payment_status === "paid" &&
      !b.tl_entered_at,
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">
            Лента активности
          </p>
          <h1 className="mt-2 font-serif text-4xl text-navy">Уведомления</h1>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Tile title="Занести в TravelLine" value={needTlEntry.length} highlight={needTlEntry.length > 0} />
          <Tile title="Новых заявок" value={newBookings.length} />
          <Tile title="Оплачено сегодня" value={todayPaid.length} />
          <Tile title="Заезжают сегодня" value={arrivingToday.length} />
        </div>

        {needTlEntry.length > 0 && (
          <Section title="Оплачено на сайте — занести в TravelLine">
            {needTlEntry.map((b) => (
              <TlEntryCard key={b.id} item={b} onDone={load} />
            ))}
          </Section>
        )}

        <Section title="Новые заявки (ждут обработки)">
          {loading && <Empty>Загрузка…</Empty>}
          {!loading && newBookings.length === 0 && <Empty>Нет новых заявок</Empty>}
          {newBookings.map((b) => (
            <Card key={b.id} item={b} accent="amber" badge="Новая" />
          ))}
        </Section>

        <Section title="Сегодня заезжают">
          {!loading && arrivingToday.length === 0 && <Empty>Сегодня нет заездов</Empty>}
          {arrivingToday.map((b) => (
            <Card key={b.id} item={b} accent="emerald" badge="Заезд сегодня" />
          ))}
        </Section>

        <Section title="Последняя активность">
          {items.slice(0, 15).map((b) => (
            <Card key={b.id} item={b} accent="zinc" />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Tile({ title, value, highlight }: { title: string; value: number; highlight?: boolean }) {
  return (
    <div className={`border p-5 ${highlight ? "border-[#C9A96E] bg-amber-50/50" : "border-border bg-background"}`}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
      <p className={`mt-2 font-serif text-4xl ${highlight ? "text-[#7a5b00]" : "text-navy"}`}>{value}</p>
    </div>
  );
}

function TlEntryCard({ item, onDone }: { item: Item; onDone: () => void }) {
  const mark = useServerFn(markBookingEnteredInTl);
  const [busy, setBusy] = useState(false);
  async function done() {
    setBusy(true);
    try {
      await mark({ data: { bookingId: item.id, entered: true } });
      onDone();
    } catch (e) {
      console.error(e);
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center justify-between gap-4 border border-border border-l-4 border-l-[#C9A96E] bg-amber-50/40 px-4 py-3 text-sm">
      <Link to="/admin/bookings" className="min-w-0 hover:underline">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-navy">{item.booking_number}</span>
          <span className="border border-[#C9A96E] bg-[#C9A96E]/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#7a5b00]">
            Сайт · оплачено
          </span>
        </div>
        <div className="mt-1 text-navy">
          {item.last_name} {item.first_name} · {item.room_name}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(parseISO(item.check_in), "d MMM", { locale: ru })} —{" "}
          {format(parseISO(item.check_out), "d MMM yyyy", { locale: ru })} ·{" "}
          ₽ {new Intl.NumberFormat("ru-RU").format(item.total_price)}
        </div>
      </Link>
      <button
        onClick={done}
        disabled={busy}
        className="shrink-0 bg-[#1a1a2e] px-3 py-2 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-[#C9A96E] disabled:opacity-50"
      >
        {busy ? "…" : "✓ Занесено в TL"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-[11px] uppercase tracking-widest text-[#C9A96E]">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

const ACCENT: Record<string, string> = {
  amber: "border-l-amber-500",
  emerald: "border-l-emerald-500",
  zinc: "border-l-zinc-300",
};

function Card({
  item,
  accent,
  badge,
}: {
  item: Item;
  accent: "amber" | "emerald" | "zinc";
  badge?: string;
}) {
  return (
    <Link
      to="/admin/bookings"
      className={`flex items-center justify-between gap-4 border border-border border-l-4 bg-background px-4 py-3 text-sm hover:border-navy ${ACCENT[accent]}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-navy">{item.booking_number}</span>
          {badge && (
            <span className="border border-border bg-cream/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-navy">
              {badge}
            </span>
          )}
        </div>
        <div className="mt-1 text-navy">
          {item.last_name} {item.first_name} · {item.room_name}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(parseISO(item.check_in), "d MMM", { locale: ru })} —{" "}
          {format(parseISO(item.check_out), "d MMM yyyy", { locale: ru })} ·{" "}
          {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true, locale: ru })}
        </div>
      </div>
      <div className="text-right font-serif text-base text-navy">
        ₽ {new Intl.NumberFormat("ru-RU").format(item.total_price)}
      </div>
    </Link>
  );
}
