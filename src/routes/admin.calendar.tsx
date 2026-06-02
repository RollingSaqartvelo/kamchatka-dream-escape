import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ROOMS } from "@/data/rooms";
import { ROOM_UNITS, assignToUnits, unitTypeId, realBookingId, unitMaintKey } from "@/data/room-units";
import { OfflineBookingModal } from "@/components/admin/OfflineBookingModal";
import { CalendarTimeline } from "@/components/admin/CalendarTimeline";
import { BookingDetailDrawer } from "@/components/admin/BookingDetailDrawer";
import { sourceIcon, sourceLabel } from "@/lib/channels";
import { syncTravellineReservations } from "@/lib/travelline-sync.functions";
import { sendTestEmail } from "@/lib/email.functions";
import { sendTelegramTest } from "@/lib/telegram.functions";

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
  tl_reservation_id?: string | null;
  first_name: string;
  last_name: string;
  salutation?: string | null;
  email?: string | null;
  room_id: string;
  room_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults?: number;
  children?: number;
  meal_plan?: string | null;
  payment_status: string;
  total_price: number;
  room_price_total?: number | null;
  breakfast_total?: number | null;
  prepayment_amount?: number | null;
  remaining_amount?: number | null;
  created_at?: string | null;
  custom_request?: string | null;
  admin_notes?: string | null;
  city?: string | null;
  country?: string | null;
  special_requests?: unknown;
  source?: string;
  phone?: string;
};

const STATUS_BG: Record<string, string> = {
  pending:   "bg-amber-400",
  confirmed: "bg-blue-500",
  paid:      "bg-emerald-500",
  cancelled: "bg-rose-400 opacity-50",
  completed: "bg-zinc-400",
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
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testTgSending, setTestTgSending] = useState(false);
  const sendTestEmailFn = useServerFn(sendTestEmail);
  const sendTelegramTestFn = useServerFn(sendTelegramTest);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalRoom, setModalRoom] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<Bk | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ booking: Bk; x: number; y: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(["pending","confirmed","paid","completed"]));
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [blocks, setBlocks] = useState<{ room_id: string; date: string }[]>([]);
  const [maint, setMaint] = useState<Set<string>>(new Set());
  const syncFn = useServerFn(syncTravellineReservations);

  // Физические номера «в ремонте» скрываются из шахматки.
  const activeUnits = useMemo(() => ROOM_UNITS.filter((u) => !maint.has(unitMaintKey(u))), [maint]);

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
    void loadBlocks();
  }, [anchor]);

  useEffect(() => {
    void loadMaint();
  }, []);

  async function loadMaint() {
    const { data, error } = await (supabase as any).from("room_maintenance").select("room_key");
    if (error) console.error(error);
    else setMaint(new Set((data ?? []).map((r: { room_key: string }) => r.room_key)));
  }

  async function loadBlocks() {
    const from = format(addDays(anchor, -1), "yyyy-MM-dd");
    const to = format(addDays(endOfMonth(anchor), 1), "yyyy-MM-dd");
    const { data, error } = await (supabase as any)
      .from("room_blocks")
      .select("room_id, date")
      .gte("date", from)
      .lte("date", to);
    if (error) console.error(error);
    else setBlocks((data as { room_id: string; date: string }[]) ?? []);
  }

  async function toggleBlock(roomId: string, date: string) {
    const exists = blocks.find(b => b.room_id === roomId && b.date === date);
    if (exists) {
      // Optimistic remove, revert on failure.
      setBlocks(prev => prev.filter(b => !(b.room_id === roomId && b.date === date)));
      const { error } = await (supabase as any)
        .from("room_blocks")
        .delete()
        .eq("room_id", roomId)
        .eq("date", date);
      if (error) { toast.error("Не удалось снять блокировку"); void loadBlocks(); }
      else toast.success("Блокировка снята");
    } else {
      setBlocks(prev => [...prev, { room_id: roomId, date }]);
      const { error } = await (supabase as any)
        .from("room_blocks")
        .insert({ room_id: roomId, date });
      if (error) { toast.error("Не удалось заблокировать дату"); void loadBlocks(); }
      else toast.success("Дата заблокирована 🚫");
    }
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

  async function handleTestEmail() {
    setTestEmailSending(true);
    try {
      const res = await sendTestEmailFn({ data: { to: "rolling_saqartvelo@outlook.com" } });
      const r = res as any;
      if (r.ok) {
        toast.success("Тестовое письмо отправлено!");
      } else {
        toast.error(`Ошибка отправки: ${r.error}`);
      }
    } catch (e) {
      toast.error("Не удалось отправить письмо");
      console.error(e);
    } finally {
      setTestEmailSending(false);
    }
  }

  async function handleTestTelegram() {
    setTestTgSending(true);
    try {
      const res = await sendTelegramTestFn({});
      if (res.ok) {
        toast.success("Тестовое сообщение отправлено в Telegram!");
      } else {
        toast.error("Ошибка: проверь TELEGRAM_BOT_TOKEN и TELEGRAM_ADMIN_CHAT_ID");
      }
    } catch (e) {
      toast.error("Не удалось отправить в Telegram");
      console.error(e);
    } finally {
      setTestTgSending(false);
    }
  }

  async function syncTravelline(full = false) {
    setSyncing(true);
    try {
      // Сохраняем только брони с заездом в окне сезона (пред. месяц … +2 вперёд),
      // т.е. при июне — май–август 2026. reset=true начинает окно модификаций заново.
      const stayFrom = format(startOfMonth(subMonths(anchor, 1)), "yyyy-MM-dd");
      const stayTo = format(endOfMonth(addMonths(anchor, 2)), "yyyy-MM-dd");
      const res = await syncFn({ data: { stayFrom, stayTo, ...(full ? { reset: true } : {}) } });
      const r = res as typeof res & {
        lastMod?: string; minCi?: string; maxCi?: string; unknown?: number;
        skipped?: number; skippedSample?: string[];
        upsertErrors?: number; cursorFrom?: string; cursorTo?: string;
      };
      console.log("TL sync:", r);
      if (res.ok) {
        toast.success(
          `+${res.synced} · мод. ${r.lastMod || "?"} · курсор ${r.cursorFrom}→${r.cursorTo} · заезды ${r.minCi || "—"}…${r.maxCi || "—"}${r.upsertErrors ? ` · ⚠upsert:${r.upsertErrors}` : ""}${r.skipped ? ` · пропущ ${r.skipped}` : ""}${res.hasMore ? " · ещё есть" : " · подтянут ✓"}`,
          { duration: 10000 },
        );
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
        "id, booking_number, tl_reservation_id, first_name, last_name, salutation, email, room_id, room_name, check_in, check_out, nights, adults, children, meal_plan, payment_status, total_price, room_price_total, breakfast_total, prepayment_amount, remaining_amount, created_at, custom_request, admin_notes, city, country, special_requests, source, phone",
      )
      .or(`and(check_in.lte.${to},check_out.gte.${from})`)
      .neq("payment_status", "cancelled")
      .order("check_in");
    if (error) console.error(error);
    else setBookings((data as Bk[]) ?? []);
    setLoading(false);
  }

  // Status-filtered list for the timeline (bars compute their own positions).
  const visibleBookings = useMemo(
    () => bookings.filter((b) => statusFilter.has(b.payment_status)),
    [bookings, statusFilter],
  );

  // Брони, разложенные по физическим комнатам/койкам (room_id → id юнита).
  // Хостельные брони реплицируются по койкам с ключами `id__bK`.
  const assignedBookings = useMemo(() => assignToUnits(visibleBookings), [visibleBookings]);

  // Индекс «юнит|дата → брони»: строится один раз за изменение
  // assignedBookings, а не фильтрует весь массив в каждой из ~1800 ячеек.
  const cellIndex = useMemo(() => {
    const idx = new Map<string, Bk[]>();
    for (const b of assignedBookings) {
      const ci = parseISO(b.check_in);
      const co = parseISO(b.check_out);
      // Бронь занимает ночи [check_in, check_out-1]; как минимум день заезда.
      const days = co > ci ? eachDayOfInterval({ start: ci, end: addDays(co, -1) }) : [ci];
      for (const d of days) {
        const key = `${b.room_id}|${format(d, "yyyy-MM-dd")}`;
        const arr = idx.get(key);
        if (arr) arr.push(b);
        else idx.set(key, [b]);
      }
    }
    return idx;
  }, [assignedBookings]);

  // Persist a drag-move / resize. `b` — это разложенная по юниту копия, а
  // `unitId` — id физической комнаты; в БД пишем тип (room_id типа), привязку
  // к конкретной комнате (room_unit) сохраним отдельным шагом.
  async function moveBooking(b: { id: string }, unitId: string, checkIn: string, checkOut: string) {
    const realId = realBookingId(b.id);
    const typeId = unitTypeId(unitId);
    const orig = bookings.find((x) => x.id === realId);
    if (!orig) return;
    if (orig.room_id === typeId && orig.check_in === checkIn && orig.check_out === checkOut) return;
    const roomName = ROOMS.find((r) => r.id === typeId)?.name_ru ?? orig.room_name;
    const nights = Math.max(1, differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)));
    setBookings((prev) =>
      prev.map((x) =>
        x.id === realId ? { ...x, room_id: typeId, room_name: roomName, check_in: checkIn, check_out: checkOut } : x,
      ),
    );
    const { error } = await supabase
      .from("bookings")
      .update({ room_id: typeId, room_name: roomName, check_in: checkIn, check_out: checkOut, nights })
      .eq("id", realId);
    if (error) {
      toast.error("Не удалось переместить бронь");
      void load();
    } else {
      toast.success("Бронь обновлена");
    }
  }

  const EMPTY = useMemo<Bk[]>(() => [], []);
  const bookingsForCell = useCallback(
    (roomId: string, day: Date) =>
      cellIndex.get(`${roomId}|${format(day, "yyyy-MM-dd")}`) ?? EMPTY,
    [cellIndex, EMPTY],
  );

  // Овербукинг: физическая комната/койка с >1 бронью в одной ячейке —
  // больше броней, чем реально вмещает тип (greedy-раскладка не нашла места).
  const conflictCount = useMemo(() => {
    let n = 0;
    for (const arr of cellIndex.values()) if (arr.length > 1) n++;
    return n;
  }, [cellIndex]);

  // Заезды и выезды на сегодня (независимо от просматриваемого месяца).
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { arrivals, departures } = useMemo(() => {
    const arr: Bk[] = [];
    const dep: Bk[] = [];
    for (const b of bookings) {
      if (!statusFilter.has(b.payment_status)) continue;
      if (b.check_in === todayStr) arr.push(b);
      if (b.check_out === todayStr) dep.push(b);
    }
    return { arrivals: arr, departures: dep };
  }, [bookings, statusFilter, todayStr]);

  // Итоги месяца — по физическим комнатам/койкам (точная заполняемость),
  // без номеров «в ремонте».
  const monthStats = useMemo(() => {
    const totalRoomNights = activeUnits.length * monthDays.length;
    let occupiedNights = 0;
    let revenue = 0;
    const uniqueBookings = new Set<string>();

    activeUnits.forEach((unit) => {
      monthDays.forEach((d) => {
        const cell = bookingsForCell(unit.id, d);
        cell.forEach((b) => {
          const realId = realBookingId(b.id);
          if (!uniqueBookings.has(realId)) {
            uniqueBookings.add(realId);
            revenue += b.total_price ?? 0;
          }
          occupiedNights++; // комната/койка-ночь
        });
      });
    });

    const pct = totalRoomNights > 0 ? Math.round((occupiedNights / totalRoomNights) * 100) : 0;
    return { occupiedNights, revenue, pct, total: uniqueBookings.size };
  }, [bookingsForCell, monthDays, activeUnits]);

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
              onClick={() => void syncTravelline(false)}
              disabled={syncing}
              className="border border-[#C9A96E] px-5 py-2 text-[11px] uppercase tracking-widest text-[#C9A96E] hover:bg-[#C9A96E] hover:text-white disabled:opacity-50"
            >
              {syncing ? "Синхронизация…" : "↻ TravelLine"}
            </button>
            <button
              onClick={() => {
                if (confirm("Сбросить курсор и начать импорт со свежих модификаций (последние 30 дней)? Это быстро подтянет текущие брони."))
                  void syncTravelline(true);
              }}
              disabled={syncing}
              title="Сбросить курсор и начать со свежих броней"
              className="border border-zinc-400 px-4 py-2 text-[11px] uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
            >
              ↻↻ Сброс + свежие
            </button>
            <button
              onClick={() => void handleTestEmail()}
              disabled={testEmailSending}
              className="border border-zinc-400 px-5 py-2 text-[11px] uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
            >
              {testEmailSending ? "Отправка…" : "✉ Тест email"}
            </button>
            <button
              onClick={() => void handleTestTelegram()}
              disabled={testTgSending}
              className="border border-sky-400 px-5 py-2 text-[11px] uppercase tracking-widest text-sky-600 hover:bg-sky-50 disabled:opacity-50"
            >
              {testTgSending ? "Отправка…" : "✈ Тест TG"}
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

        {/* Конфликты двойных броней */}
        {conflictCount > 0 && (
          <div className="mt-4 flex items-center gap-2 border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
            <span className="text-base">⚠️</span>
            Обнаружены пересечения броней: {conflictCount} ячеек с двойным
            бронированием (обведены красным). Проверьте и разнесите по номерам.
          </div>
        )}

        {/* Заезды / выезды сегодня */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ArrivalsBoard
            title="🛬 Заезды сегодня"
            list={arrivals}
            empty="Сегодня заездов нет"
            onPick={setSelected}
          />
          <ArrivalsBoard
            title="🛫 Выезды сегодня"
            list={departures}
            empty="Сегодня выездов нет"
            onPick={setSelected}
          />
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

        {/* Grid — таймлайн с перетаскиванием и ресайзом */}
        {loading ? (
          <div className="mt-6 border border-border bg-background px-4 py-12 text-center text-muted-foreground">
            Загрузка…
          </div>
        ) : (
          <>
            <p className="mt-4 text-[11px] text-muted-foreground">
              Перетащите бронь, чтобы сменить номер или даты · потяните за край — изменить срок ·
              клик по пустой ячейке — новая бронь · правый клик — статус / блокировка
            </p>
            <CalendarTimeline
              rooms={activeUnits}
              days={monthDays}
              bookings={assignedBookings}
              defaultCollapsed={Object.keys(HOSTEL_CAPACITY)}
              hostelBg={hostelOccupancyBg}
              hostelText={hostelOccupancyText}
              isBlocked={(roomId, day) => isBlocked(unitTypeId(roomId), day)}
              onToggleBlock={(roomId, date) => toggleBlock(unitTypeId(roomId), date)}
              onCreate={(roomId, day) => {
                setModalRoom(unitTypeId(roomId));
                setModalDate(day);
              }}
              onOpen={(b) => setSelected(bookings.find((x) => x.id === realBookingId(b.id)) ?? null)}
              onContext={(b, x, y) => {
                const real = bookings.find((x) => x.id === realBookingId(b.id));
                if (real) setCtxMenu({ booking: real, x, y });
              }}
              onTooltip={(t) => setTooltip(t as TooltipData | null)}
              onMove={moveBooking}
            />
          </>
        )}
      </div>

      <OfflineBookingModal
        open={modalDate !== null}
        onClose={() => setModalDate(null)}
        initialRoomId={modalRoom}
        initialCheckIn={modalDate ?? undefined}
        onCreated={() => void load()}
      />

      {/* Detail drawer — полная карточка брони */}
      {selected && (
        <BookingDetailDrawer
          booking={selected}
          onClose={() => setSelected(null)}
          onChangeStatus={(id, status) => {
            void changeStatus(id, status);
            setSelected((s) => (s ? { ...s, payment_status: status } : s));
          }}
        />
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
            <p>{sourceIcon((tooltip.booking as any).source ?? "manual")} {sourceLabel((tooltip.booking as any).source ?? "manual")}</p>
            <p className="font-mono text-[10px] text-zinc-400">{tooltip.booking.booking_number}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ArrivalsBoard({
  title,
  list,
  empty,
  onPick,
}: {
  title: string;
  list: Bk[];
  empty: string;
  onPick: (b: Bk) => void;
}) {
  return (
    <div className="rounded border border-border bg-background">
      <p className="border-b border-border px-4 py-2 text-[11px] uppercase tracking-widest text-navy">
        {title} · {list.length}
      </p>
      {list.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="max-h-40 divide-y divide-border overflow-y-auto">
          {list.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onPick(b)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-cream/50"
              >
                <span className="truncate text-navy">
                  {b.last_name} {b.first_name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{b.room_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
