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

const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-amber-400 text-amber-950 border-amber-500",
  confirmed: "bg-blue-500 text-white border-blue-700",
  paid:      "bg-emerald-500 text-white border-emerald-700",
  cancelled: "bg-rose-400 text-white border-rose-500 line-through opacity-60",
  completed: "bg-zinc-400 text-white border-zinc-600",
};

// ID хостельных номеров → максимальное число мест
const HOSTEL_CAPACITY: Record<string, number> = {
  "hostel-10-mest":   10,
  "hostel-10-mest-b": 10,
  "hostel-4-mesta":    4,
  "hostel-12-mest":   12,
};

function hostelOccupancyBg(ratio: number): string {
  if (ratio === 0)   return "";
  if (ratio < 0.5)   return "bg-sky-300";
  if (ratio < 0.8)   return "bg-blue-500";
  if (ratio < 1)     return "bg-orange-500";
  return "bg-red-600";
}

function hostelOccupancyText(ratio: number): string {
  if (ratio === 0) return "text-zinc-400";
  if (ratio < 0.5) return "text-sky-950";
  return "text-white";
}

const SOURCE_ICON: Record<string, string> = {
  travelline: "🔄",
  website:    "🌐",
  manual:     "✏️",
  offline:    "✏️",
};

const STATUS_LABEL: Record<string, string> = {
  pending:   "Новая",
  confirmed: "Подтверждена",
  paid:      "Оплачена",
  cancelled: "Отменена",
  completed: "Завершена",
};

type TooltipData = {
  booking: Bk & { source?: string; phone?: string };
  x: number;
  y: number;
};

function AdminCalendarPage() {
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [bookings, setBookings] = useState<Bk[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalRoom, setModalRoom] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<Bk | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ booking: Bk; x: number; y: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(["pending","confirmed","paid","completed"]));
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [blocks, setBlocks] = useState<{ room_id: string; date: string }[]>([]);
  const syncFn = useServerFn(syncTravellineReservations);

  // Автосинхронизация TravelLine каждые 15 минут
  useEffect(() => {
    const interval = setInterval(() => void syncTravelline(), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [anchor]);

  const monthDays = useMemo(
    () => eachDayOfInterval(
      viewMode === "month"
        ? { start: anchor, end: endOfMonth(anchor) }
        : { start: anchor, end: addDays(anchor, 6) }
    ), [anchor, viewMode]);


  useEffect(() => {
    void load();
  }, [anchor]);

  function toggleBlock(roomId: string, date: string) {
    setBlocks(prev => {
      const exists = prev.find(b => b.room_id === roomId && b.date === date);
      if (exists) { toast.success("Блокировка снята"); return prev.filter(b => !(b.room_id === roomId && b.date === date)); }
      toast.success("Дата заблокирована 🚫");
      return [...prev, { room_id: roomId, date }];
    });
  }

  function isBlocked(roomId: string, day: Date) {
    return blocks.some(b => b.room_id === roomId && b.date === format(day, "yyyy-MM-dd"));
  }

  async function changeStatus(bookingId: string, status: string) {
    const { error } = await supabase.from("bookings").update({ payment_status: status }).eq("id", bookingId);
    if (error) toast.error("Не удалось изменить статус");
    else { toast.success(`Статус изменён: ${STATUS_LABEL[status]}`); void load(); }
    setCtxMenu(null);
  }

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
        "id, booking_number, first_name, last_name, room_id, room_name, check_in, check_out, payment_status, total_price, source, phone",
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
      if (!statusFilter.has(b.payment_status)) return false;
      const ci = parseISO(b.check_in);
      const co = parseISO(b.check_out);
      return isWithinInterval(day, { start: ci, end: addDays(co, -1) }) || isSameDay(day, ci);
    });
  }

  // Итоги месяца
  const monthStats = useMemo(() => {
    const totalRoomNights = ROOMS.length * monthDays.length;
    let occupiedNights = 0;
    let revenue = 0;
    const uniqueBookings = new Set<string>();
    bookings.forEach((b) => {
      if (!uniqueBookings.has(b.id)) {
        uniqueBookings.add(b.id);
        revenue += b.total_price ?? 0;
      }
      monthDays.forEach((d) => {
        const ci = parseISO(b.check_in);
        const co = parseISO(b.check_out);
        if (isWithinInterval(d, { start: ci, end: addDays(co, -1) }) || isSameDay(d, ci)) {
          occupiedNights++;
        }
      });
    });
    const pct = totalRoomNights > 0 ? Math.round((occupiedNights / totalRoomNights) * 100) : 0;
    return { occupiedNights, revenue, pct, total: uniqueBookings.size };
  }, [bookings, monthDays]);

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
            <div className="flex rounded border border-border overflow-hidden text-[11px] uppercase tracking-widest">
              {(["month","week"] as const).map((m) => (
                <button key={m} onClick={() => { setViewMode(m); setAnchor(startOfMonth(anchor)); }}
                  className={`px-3 py-2 ${viewMode === m ? "bg-navy text-cream" : "hover:bg-cream/40"}`}>
                  {m === "month" ? "Месяц" : "Неделя"}
                </button>
              ))}
            </div>
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

        {/* Итоги месяца */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Броней в месяце", value: monthStats.total, icon: "📋" },
            { label: "Занято ночей", value: monthStats.occupiedNights, icon: "🌙" },
            { label: "Заполняемость", value: `${monthStats.pct}%`, icon: "📊" },
            { label: "Выручка", value: `₽ ${new Intl.NumberFormat("ru-RU").format(monthStats.revenue)}`, icon: "💰" },
          ].map((s) => (
            <div key={s.label} className="rounded border border-border bg-cream/30 px-4 py-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{s.icon} {s.label}</p>
              <p className="mt-1 font-serif text-2xl text-navy">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Legend + фильтр */}
        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          {(["pending","confirmed","paid","completed","cancelled"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setStatusFilter(prev => {
                const next = new Set(prev);
                next.has(k) ? next.delete(k) : next.add(k);
                return next;
              })}
              className={`border px-2 py-0.5 transition-opacity ${STATUS_COLOR[k]} ${statusFilter.has(k) ? "opacity-100" : "opacity-30"}`}
            >
              {statusFilter.has(k) ? "✓ " : ""}{STATUS_LABEL[k]}
            </button>
          ))}
          <span className="ml-2 self-center text-[10px] text-muted-foreground">← кликни чтобы скрыть</span>
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
                          className={`relative min-w-[40px] cursor-pointer border-r border-border p-0 ${
                            HOSTEL_CAPACITY[room.id]
                              ? "h-14"
                              : "h-14"
                          } ${
                            !HOSTEL_CAPACITY[room.id] && cellBookings[0]
                              ? (STATUS_BG[cellBookings[0].payment_status] ?? STATUS_BG.pending)
                              : !HOSTEL_CAPACITY[room.id] && isSameDay(d, new Date())
                              ? "bg-[#C9A96E]/10 hover:bg-[#C9A96E]/20"
                              : !HOSTEL_CAPACITY[room.id]
                              ? "hover:bg-cream/40"
                              : ""
                          }`}
                          onClick={() => {
                            if (cellBookings[0]) setSelected(cellBookings[0]);
                            else { setModalRoom(room.id); setModalDate(d); }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (cellBookings[0]) {
                              setCtxMenu({ booking: cellBookings[0], x: e.clientX, y: e.clientY });
                            } else {
                              toggleBlock(room.id, format(d, "yyyy-MM-dd"));
                            }
                          }}
                        >
                          {/* Блокировка техобслуживания */}
                          {isBlocked(room.id, d) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-200"
                              style={{ backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(0,0,0,0.08) 4px,rgba(0,0,0,0.08) 8px)" }}
                              title="Заблокировано — техобслуживание">
                              <span className="text-[11px]">🚫</span>
                            </div>
                          )}

                          {/* Обычный номер — полная заливка */}
                          {!HOSTEL_CAPACITY[room.id] && cellBookings[0] && !isBlocked(room.id, d) && (
                            <div
                              className={`flex h-full w-full flex-col items-center justify-center px-1 ${STATUS_TEXT[cellBookings[0].payment_status] ?? "text-white"}`}
                              onMouseEnter={(e) => setTooltip({ booking: cellBookings[0] as any, x: e.clientX, y: e.clientY })}
                              onMouseMove={(e) => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              {cellBookings[0].last_name && cellBookings[0].last_name !== "—" && (
                                <span className="w-full truncate text-center text-[10px] font-bold leading-tight">
                                  {cellBookings[0].last_name}
                                </span>
                              )}
                              <span className="text-[9px] opacity-70">
                                {SOURCE_ICON[(cellBookings[0] as any).source ?? "manual"] ?? "✏️"}
                              </span>
                            </div>
                          )}

                          {/* Хостел — счётчик мест */}
                          {HOSTEL_CAPACITY[room.id] && (() => {
                            const cap = HOSTEL_CAPACITY[room.id];
                            const occupied = cellBookings.reduce((s, b) => s + Math.max(1, b.adults ?? 1), 0);
                            const ratio = Math.min(occupied / cap, 1);
                            const bgCls = hostelOccupancyBg(ratio);
                            const txtCls = hostelOccupancyText(ratio);
                            const pct = Math.round(ratio * 100);
                            return (
                              <div
                                className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden ${isSameDay(d, new Date()) ? "ring-1 ring-inset ring-[#C9A96E]" : ""}`}
                                title={cellBookings.map(b => `${b.last_name} ${b.first_name}`).join(", ")}
                              >
                                {/* заливка по высоте */}
                                {ratio > 0 && (
                                  <div
                                    className={`absolute bottom-0 left-0 w-full transition-all ${bgCls}`}
                                    style={{ height: `${pct}%` }}
                                  />
                                )}
                                {/* текст поверх */}
                                <span className={`relative z-10 text-[11px] font-bold ${occupied > 0 ? txtCls : "text-zinc-300"}`}>
                                  {occupied > 0 ? `${occupied}/${cap}` : ""}
                                </span>
                                {occupied > 0 && (
                                  <span className={`relative z-10 text-[9px] ${txtCls} opacity-80`}>
                                    мест
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
            {/* Строка заполняемости по дням */}
            <tfoot>
              <tr className="border-t-2 border-border bg-cream/40">
                <td className="sticky left-0 z-10 border-r border-border bg-cream/80 px-3 py-2 text-[10px] uppercase tracking-widest text-navy">
                  Занято
                </td>
                {monthDays.map((d) => {
                  const occupied = ROOMS.filter((r) => bookingsForCell(r.id, d).length > 0).length;
                  const pct = Math.round((occupied / ROOMS.length) * 100);
                  const bg = pct === 0 ? "" : pct < 40 ? "bg-sky-200" : pct < 70 ? "bg-blue-400" : pct < 90 ? "bg-orange-400" : "bg-red-500";
                  const txt = pct > 50 ? "text-white" : "text-navy";
                  return (
                    <td
                      key={d.toISOString()}
                      className={`border-r border-border px-1 py-2 text-center text-[10px] font-bold ${bg} ${txt}`}
                      title={`${occupied} из ${ROOMS.length} номеров занято`}
                    >
                      {occupied > 0 ? `${pct}%` : ""}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
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

      {/* Контекстное меню — смена статуса */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setCtxMenu(null)} />
          <div
            className="fixed z-[100] w-48 rounded-lg border border-border bg-background shadow-xl overflow-hidden"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
              Сменить статус
            </p>
            {(["pending","confirmed","paid","completed","cancelled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => void changeStatus(ctxMenu.booking.id, s)}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-cream/60 flex items-center gap-2 ${ctxMenu.booking.payment_status === s ? "font-bold" : ""}`}
              >
                <span className={`inline-block h-2 w-2 rounded-full ${STATUS_BG[s]}`} />
                {STATUS_LABEL[s]}
                {ctxMenu.booking.payment_status === s && " ✓"}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Тултип */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-[100] w-56 rounded-lg border border-border bg-background p-3 shadow-xl text-xs"
          style={{
            left: Math.min(tooltip.x + 12, window.innerWidth - 240),
            top: tooltip.y - 10,
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-bold text-navy text-sm">
              {tooltip.booking.last_name !== "—" ? `${tooltip.booking.last_name} ${tooltip.booking.first_name}` : "Гость"}
            </span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLOR[tooltip.booking.payment_status] ?? STATUS_COLOR.pending}`}>
              {STATUS_LABEL[tooltip.booking.payment_status] ?? tooltip.booking.payment_status}
            </span>
          </div>
          <div className="space-y-1 text-muted-foreground">
            <p>📅 {format(parseISO(tooltip.booking.check_in), "d MMM", { locale: ru })} — {format(parseISO(tooltip.booking.check_out), "d MMM", { locale: ru })}</p>
            {(tooltip.booking as any).phone && <p>📞 {(tooltip.booking as any).phone}</p>}
            <p>💰 ₽ {new Intl.NumberFormat("ru-RU").format(tooltip.booking.total_price)}</p>
            <p>{SOURCE_ICON[(tooltip.booking as any).source ?? "manual"]} {(tooltip.booking as any).source === "travelline" ? "TravelLine" : (tooltip.booking as any).source === "website" ? "Сайт" : "Вручную"}</p>
            <p className="font-mono text-[10px] text-zinc-400">{tooltip.booking.booking_number}</p>
          </div>
        </div>
      )}
    </div>
  );
}
