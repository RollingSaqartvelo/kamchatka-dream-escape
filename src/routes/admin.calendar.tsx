import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ROOMS } from "@/data/rooms";
import { OfflineBookingModal } from "@/components/admin/OfflineBookingModal";
import { syncTravellineReservations } from "@/lib/travelline-sync.functions";

export const Route = createFileRoute("/admin/calendar")({
  component: AdminCalendarPage,
  head: () => ({
    meta: [
      { title: "Календарь — Админка «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Bk = {
  id: string;
  booking_number: string;
  first_name: string;
  last_name: string;
  room_id: string;
  room_name: string;
  check_in: string;
  check_out: string;
  payment_status: string;
  total_price: number;
};

const STATUS_BG: Record<string, string> = {
  pending:   "bg-amber-400",
  confirmed: "bg-blue-500",
  paid:      "bg-emerald-500",
  cancelled: "bg-rose-400 opacity-50",
  completed: "bg-zinc-400",
};

const STATUS_TEXT: Record<string, string> = {
  pending:   "text-amber-950",
  confirmed: "text-white",
  paid:      "text-white",
  cancelled: "text-white line-through",
  completed: "text-white",
};

// оставляем для легенды
const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-amber-400 text-amber-950 border-amber-500",
  confirmed: "bg-blue-500 text-white border-blue-700",
  paid:      "bg-emerald-500 text-white border-emerald-700",
  cancelled: "bg-rose-400 text-white border-rose-500 line-through opacity-60",
  completed: "bg-zinc-400 text-white border-zinc-600",
};

function AdminCalendarPage() {
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [bookings, setBookings] = useState<Bk[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalRoom, setModalRoom] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<Bk | null>(null);
  const syncFn = useServerFn(syncTravellineReservations);

  const monthDays = useMemo(
    () =>
      eachDayOfInterval({
        start: anchor,
        end: endOfMonth(anchor),
      }),
    [anchor],
  );

  useEffect(() => {
    void load();
  }, [anchor]);

  async function syncTravelline() {
    setSyncing(true);
    const from = format(anchor, "yyyy-MM-dd");
    const to = format(endOfMonth(addMonths(anchor, 1)), "yyyy-MM-dd");
    try {
      const res = await syncFn({ data: { from, to } });
      if (res.ok) {
        toast.success(`Синхронизировано: ${res.synced} броней из TravelLine`);
        void load();
      } else {
        toast.error(`Ошибка TravelLine: ${res.error}`);
        console.error("TL sync error:", res);
      }
    } catch (e) {
      toast.error("Не удалось подключиться к TravelLine");
      console.error(e);
    } finally {
      setSyncing(false);
    }
  }

  async function load() {
    setLoading(true);
    // Load bookings overlapping this month +/- some buffer
    const from = format(addDays(anchor, -1), "yyyy-MM-dd");
    const to = format(addDays(endOfMonth(anchor), 1), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_number, first_name, last_name, room_id, room_name, check_in, check_out, payment_status, total_price",
      )
      .or(`and(check_in.lte.${to},check_out.gte.${from})`)
      .neq("payment_status", "cancelled")
      .order("check_in");
    if (error) console.error(error);
    else setBookings((data as Bk[]) ?? []);
    setLoading(false);
  }

  function bookingsForCell(roomId: string, day: Date) {
    return bookings.filter((b) => {
      if (b.room_id !== roomId) return false;
      const ci = parseISO(b.check_in);
      const co = parseISO(b.check_out);
      // booked day = [check_in, check_out) — checkout day is free
      return isWithinInterval(day, { start: ci, end: addDays(co, -1) }) || isSameDay(day, ci);
    });
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">
              Заполняемость
            </p>
            <h1 className="mt-2 font-serif text-4xl text-navy">Календарь броней</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAnchor(subMonths(anchor, 1))}
              className="border border-border px-3 py-2 text-sm hover:border-navy"
            >
              ←
            </button>
            <div className="min-w-40 text-center font-serif text-lg capitalize text-navy">
              {format(anchor, "LLLL yyyy", { locale: ru })}
            </div>
            <button
              onClick={() => setAnchor(addMonths(anchor, 1))}
              className="border border-border px-3 py-2 text-sm hover:border-navy"
            >
              →
            </button>
            <button
              onClick={() => setAnchor(startOfMonth(new Date()))}
              className="border border-border px-3 py-2 text-[10px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream"
            >
              Сегодня
            </button>
            <button
              onClick={() => void syncTravelline()}
              disabled={syncing}
              className="border border-[#C9A96E] px-5 py-2 text-[11px] uppercase tracking-widest text-[#C9A96E] hover:bg-[#C9A96E] hover:text-white disabled:opacity-50"
            >
              {syncing ? "Синхронизация…" : "↻ TravelLine"}
            </button>
            <button
              onClick={() => {
                setModalRoom(undefined);
                setModalDate(new Date());
              }}
              className="bg-navy px-5 py-2 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E]"
            >
              + Бронь вручную
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-[11px]">
          {Object.entries({
            pending: "Новая",
            confirmed: "Подтверждена",
            paid: "Оплачена",
            completed: "Завершена",
          }).map(([k, label]) => (
            <span key={k} className={`border px-2 py-0.5 ${STATUS_COLOR[k]}`}>
              {label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-6 overflow-x-auto border border-border bg-background">
          <table className="min-w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-cream/60">
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-border bg-cream/80 px-3 py-2 text-left text-[10px] uppercase tracking-widest text-navy">
                  Номер
                </th>
                {monthDays.map((d) => (
                  <th
                    key={d.toISOString()}
                    className={`border-b border-border px-1 py-2 text-center text-[10px] ${
                      isSameDay(d, new Date()) ? "bg-[#C9A96E]/20 text-navy" : "text-muted-foreground"
                    }`}
                  >
                    <div>{format(d, "EEE", { locale: ru })}</div>
                    <div className="font-mono text-sm text-navy">{format(d, "d")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={monthDays.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                    Загрузка…
                  </td>
                </tr>
              )}
              {!loading &&
                ROOMS.map((room) => (
                  <tr key={room.id} className="border-b border-border last:border-b-0">
                    <td className="sticky left-0 z-10 border-r border-border bg-background px-3 py-2 align-top text-navy">
                      <div className="line-clamp-2 max-w-[180px] text-xs">{room.name_ru}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        от {room.price_from_rub} ₽
                      </div>
                    </td>
                    {monthDays.map((d) => {
                      const cellBookings = bookingsForCell(room.id, d);
                      return (
                        <td
                          key={d.toISOString()}
                          className={`relative h-14 min-w-[40px] cursor-pointer border-r border-border p-0 ${
                            cellBookings[0]
                              ? (STATUS_BG[cellBookings[0].payment_status] ?? STATUS_BG.pending)
                              : isSameDay(d, new Date())
                              ? "bg-[#C9A96E]/10 hover:bg-[#C9A96E]/20"
                              : "hover:bg-cream/40"
                          }`}
                          onClick={() => {
                            if (cellBookings[0]) {
                              setSelected(cellBookings[0]);
                            } else {
                              setModalRoom(room.id);
                              setModalDate(d);
                            }
                          }}
                        >
                          {cellBookings[0] && (
                            <div
                              className={`flex h-full w-full flex-col items-center justify-center px-1 ${STATUS_TEXT[cellBookings[0].payment_status] ?? "text-white"}`}
                              title={`${cellBookings[0].booking_number} · ${cellBookings[0].last_name} ${cellBookings[0].first_name}`}
                            >
                              {cellBookings[0].last_name && cellBookings[0].last_name !== "—" && (
                                <span className="w-full truncate text-center text-[10px] font-bold leading-tight">
                                  {cellBookings[0].last_name}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <OfflineBookingModal
        open={modalDate !== null}
        onClose={() => setModalDate(null)}
        initialRoomId={modalRoom}
        initialCheckIn={modalDate ?? undefined}
        onCreated={() => void load()}
      />

      {/* Detail mini-drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-background p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-lg text-navy">{selected.booking_number}</p>
              <button onClick={() => setSelected(null)} className="text-2xl text-muted-foreground">
                ×
              </button>
            </div>
            <div className="mt-6 space-y-2 text-sm">
              <p className="text-navy">
                {selected.last_name} {selected.first_name}
              </p>
              <p className="text-muted-foreground">{selected.room_name}</p>
              <p>
                {format(parseISO(selected.check_in), "d MMM", { locale: ru })} —{" "}
                {format(parseISO(selected.check_out), "d MMM yyyy", { locale: ru })}
              </p>
              <p className="font-serif text-xl text-navy">
                ₽ {new Intl.NumberFormat("ru-RU").format(selected.total_price)}
              </p>
              <p className="text-xs uppercase tracking-widest text-[#C9A96E]">
                {selected.payment_status}
              </p>
              <a
                href={`/admin/bookings`}
                className="mt-4 inline-block border border-navy px-4 py-2 text-[10px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream"
              >
                Открыть в списке
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
