import { useEffect, useMemo, useState } from "react";
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
  source?: string;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-300 text-amber-950 border-amber-500",
  confirmed: "bg-blue-500 text-white border-blue-700",
  paid: "bg-emerald-500 text-white border-emerald-700",
  cancelled: "bg-rose-300 text-rose-950 border-rose-500 line-through opacity-60",
  completed: "bg-zinc-400 text-white border-zinc-600",
};

export function BookingsCalendar() {
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [bookings, setBookings] = useState<Bk[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalRoom, setModalRoom] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<Bk | null>(null);
  const syncFn = useServerFn(syncTravellineReservations);

  const monthDays = useMemo(
    () => eachDayOfInterval({ start: anchor, end: endOfMonth(anchor) }),
    [anchor],
  );

  useEffect(() => {
    void load();
  }, [anchor]);

  async function load() {
    setLoading(true);
    const from = format(addDays(anchor, -1), "yyyy-MM-dd");
    const to = format(addDays(endOfMonth(anchor), 1), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_number, first_name, last_name, room_id, room_name, check_in, check_out, payment_status, total_price, source",
      )
      .or(`and(check_in.lte.${to},check_out.gte.${from})`)
      .neq("payment_status", "cancelled")
      .order("check_in");
    if (error) console.error(error);
    else setBookings((data as Bk[]) ?? []);
    setLoading(false);
  }

  async function syncTravelline() {
    setSyncing(true);
    try {
      const from = format(addDays(anchor, -7), "yyyy-MM-dd");
      const to = format(addDays(endOfMonth(anchor), 14), "yyyy-MM-dd");
      const res = await syncFn({ data: { from, to } });
      if (res.ok) {
        toast.success(
          `Travelline синхронизирован: ${res.synced} брон.${res.hasMore ? " (есть ещё — повторите)" : ""}`,
        );
      } else {
        toast.error(`Travelline: ${res.error?.slice(0, 200) ?? "ошибка"}`);
      }
      await load();
    } catch (e) {
      toast.error(`Sync failed: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }

  function bookingsForCell(roomId: string, day: Date) {
    return bookings.filter((b) => {
      if (b.room_id !== roomId) return false;
      const ci = parseISO(b.check_in);
      const co = parseISO(b.check_out);
      return (
        isWithinInterval(day, { start: ci, end: addDays(co, -1) }) || isSameDay(day, ci)
      );
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={syncTravelline}
            disabled={syncing}
            className="border border-[#C9A96E] px-4 py-2 text-[10px] uppercase tracking-widest text-[#C9A96E] hover:bg-[#C9A96E] hover:text-cream disabled:opacity-50"
          >
            {syncing ? "Синхронизация…" : "Sync Travelline"}
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
                    isSameDay(d, new Date())
                      ? "bg-[#C9A96E]/20 text-navy"
                      : "text-muted-foreground"
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
                <td
                  colSpan={monthDays.length + 1}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
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
                    const top = cellBookings[0];
                    return (
                      <td
                        key={d.toISOString()}
                        className={`relative h-14 min-w-[40px] cursor-pointer border-r border-border p-0 align-top ${
                          top
                            ? ""
                            : isSameDay(d, new Date())
                              ? "bg-[#C9A96E]/10 hover:bg-cream/40"
                              : "hover:bg-cream/40"
                        }`}
                        onClick={() => {
                          if (top) {
                            setSelected(top);
                          } else {
                            setModalRoom(room.id);
                            setModalDate(d);
                          }
                        }}
                      >
                        {top && (
                          <div
                            className={`flex h-full w-full items-center justify-center truncate border px-1 text-[10px] font-medium ${
                              STATUS_COLOR[top.payment_status] ?? STATUS_COLOR.pending
                            }`}
                            title={`${top.booking_number} · ${top.last_name} ${top.first_name}${top.source === "travelline" ? " · TL" : ""}`}
                          >
                            {top.last_name}
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

      <OfflineBookingModal
        open={modalDate !== null}
        onClose={() => setModalDate(null)}
        initialRoomId={modalRoom}
        initialCheckIn={modalDate ?? undefined}
        onCreated={() => void load()}
      />

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
              <button
                onClick={() => setSelected(null)}
                className="text-2xl text-muted-foreground"
              >
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
                href="/admin/bookings"
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
