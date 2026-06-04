import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, differenceInCalendarDays, format, isSameDay, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type TBk = {
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
  adults?: number;
  source?: string;
  phone?: string;
};

const STATUS_BG: Record<string, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-blue-500",
  paid: "bg-emerald-500",
  cancelled: "bg-rose-400 opacity-50",
  completed: "bg-zinc-400",
};
const STATUS_TEXT: Record<string, string> = {
  pending: "text-amber-950",
  confirmed: "text-white",
  paid: "text-white",
  cancelled: "text-white line-through",
  completed: "text-white",
};
const SOURCE_ICON: Record<string, string> = {
  travelline: "🔄",
  website: "🌐",
  manual: "✏️",
  offline: "✏️",
};

const DAY_W = 44;
const LANE_H = 26;
const GROUP_H = 40; // высота строки-заголовка типа (с занятостью по дням)
const LABEL_W = 210;
// Minimum row height so a booking bar never overlaps the next row.
const MIN_ROW_H = 36;

// Юнит = физическая комната или койка. Несколько юнитов одного типа образуют
// сворачиваемую группу.
type Room = {
  id: string;
  typeId: string;
  groupName: string; // имя типа — заголовок группы
  unitLabel: string; // подпись строки: «№ 12» | «Кровать №1» | имя одиночного типа
  price_from_rub: number;
  hostelBed?: boolean; // койка хостела — пересечения НЕ считаем конфликтом (общая комната)
};

type Group = { typeId: string; groupName: string; price: number; units: Room[]; single: boolean };

type DragMode = "move" | "resize-l" | "resize-r";
type DragState = {
  mode: DragMode;
  booking: TBk;
  startX: number;
  startCi: Date;
  startCo: Date;
  preview: { roomId: string; ci: Date; co: Date };
  moved: boolean;
};

type Props = {
  rooms: Room[];
  days: Date[];
  bookings: TBk[]; // already status-filtered and assigned to unit ids
  defaultCollapsed?: string[]; // typeIds свёрнутые по умолчанию (хостелы)
  hostelBg: (ratio: number) => string;
  hostelText: (ratio: number) => string;
  isBlocked: (roomId: string, day: Date) => boolean;
  onToggleBlock: (roomId: string, dateStr: string) => void;
  onCreate: (roomId: string, day: Date) => void;
  onOpen: (b: TBk) => void;
  onContext: (b: TBk, x: number, y: number) => void;
  onTooltip: (t: { booking: TBk; x: number; y: number } | null) => void;
  onMove: (b: TBk, roomId: string, checkIn: string, checkOut: string) => void;
  searchActive?: boolean; // приглушить несовпавшие брони
  isMatch?: (b: TBk) => boolean; // подсветить совпавшие с поиском
  scrollTarget?: { roomId: string; dateStr: string; nonce: number } | null; // прыжок к ячейке
};

export function CalendarTimeline({
  rooms,
  days,
  bookings,
  defaultCollapsed,
  hostelBg,
  hostelText,
  isBlocked,
  onToggleBlock,
  onCreate,
  onOpen,
  onContext,
  onTooltip,
  onMove,
  searchActive,
  isMatch,
  scrollTarget,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const rowLayoutRef = useRef<{ roomId: string; top: number; height: number }[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [ptr, setPtr] = useState<{ x: number; y: number } | null>(null);
  const [flashRoom, setFlashRoom] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(defaultCollapsed ?? []));
  const toggleGroup = (typeId: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(typeId) ? next.delete(typeId) : next.add(typeId);
      return next;
    });

  const len = days.length;
  const today = new Date();
  const dayIndex = (d: Date) => differenceInCalendarDays(d, days[0]);
  const clampIdx = (i: number) => Math.max(0, Math.min(len, i));

  // Stretch day columns to fill the container (week view fills same width as
  // month); never narrower than DAY_W so month view still scrolls.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWrapW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const dayW = wrapW > 0 ? Math.max(DAY_W, Math.floor((wrapW - LABEL_W) / Math.max(1, len))) : DAY_W;

  // Автоскролл к сегодня: при смене периода прокручиваем так, чтобы текущая дата
  // была видна слева (если она вообще попадает в окно).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || dayW <= 0) return;
    const idx = differenceInCalendarDays(today, days[0]);
    if (idx < 0 || idx >= len) return;
    el.scrollLeft = Math.max(0, idx * dayW - dayW * 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, dayW, len]);

  // Прыжок к ячейке (конфликт / поиск): разворачиваем группу при необходимости,
  // скроллим по горизонтали и вертикали, подсвечиваем строку на ~1.6с.
  useEffect(() => {
    if (!scrollTarget) return;
    const { roomId, dateStr } = scrollTarget;
    const room = rooms.find((r) => r.id === roomId);
    if (room && collapsed.has(room.typeId)) {
      setCollapsed((prev) => {
        const n = new Set(prev);
        n.delete(room.typeId);
        return n;
      });
    }
    const raf = requestAnimationFrame(() => {
      const el = wrapRef.current;
      if (el) {
        const idx = differenceInCalendarDays(parseISO(dateStr), days[0]);
        if (idx >= 0) el.scrollLeft = Math.max(0, idx * dayW - dayW * 3);
      }
      const rowEl = bodyRef.current?.querySelector<HTMLElement>(`[data-roomid="${CSS.escape(roomId)}"]`);
      rowEl?.scrollIntoView({ block: "center", behavior: "smooth" });
      setFlashRoom(roomId);
    });
    const t = setTimeout(() => setFlashRoom(null), 1600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTarget]);

  // Apply live drag preview to the dragged booking so it re-lays-out as you drag.
  const effBookings = useMemo(() => {
    if (!drag?.moved) return bookings;
    const p = drag.preview;
    return bookings.map((b) =>
      b.id === drag.booking.id
        ? { ...b, room_id: p.roomId, check_in: format(p.ci, "yyyy-MM-dd"), check_out: format(p.co, "yyyy-MM-dd") }
        : b,
    );
  }, [bookings, drag]);

  const byRoom = useMemo(() => {
    const m = new Map<string, TBk[]>();
    for (const b of effBookings) {
      const arr = m.get(b.room_id);
      if (arr) arr.push(b);
      else m.set(b.room_id, [b]);
    }
    return m;
  }, [effBookings]);

  // Группы типов (в порядке rooms).
  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    let cur: Group | null = null;
    for (const r of rooms) {
      if (!cur || cur.typeId !== r.typeId) {
        cur = { typeId: r.typeId, groupName: r.groupName, price: r.price_from_rub, units: [], single: false };
        out.push(cur);
      }
      cur.units.push(r);
    }
    for (const g of out) g.single = g.units.length === 1 && g.units[0].id === g.typeId;
    return out;
  }, [rooms]);

  // Занятость каждого юнита по дням (битовая маска длиной len).
  const occByUnit = useMemo(() => {
    const m = new Map<string, Uint8Array>();
    for (const r of rooms) {
      const arr = new Uint8Array(len);
      for (const b of byRoom.get(r.id) ?? []) {
        const s = dayIndex(parseISO(b.check_in));
        const e = dayIndex(parseISO(b.check_out)); // checkout day exclusive
        for (let i = Math.max(0, s); i < e && i < len; i++) arr[i] = 1;
      }
      m.set(r.id, arr);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byRoom, rooms, len, days]);

  // Раскладка строк: заголовок группы + (если развёрнута) строки-юниты с
  // распределением по дорожкам (overlap stacking). Считаем top для drag-drop.
  type Item =
    | { kind: "header"; group: Group; occ: Uint16Array; top: number; height: number }
    | {
        kind: "row";
        room: Room;
        placed: { b: TBk; lane: number; conflict: boolean }[];
        top: number;
        height: number;
      };
  const items = useMemo<Item[]>(() => {
    let top = 0;
    const out: Item[] = [];
    for (const g of groups) {
      const isCollapsed = collapsed.has(g.typeId);
      // Одиночный тип рисуем как обычную строку без заголовка.
      if (!g.single) {
        const occ = new Uint16Array(len);
        for (const u of g.units) {
          const ob = occByUnit.get(u.id);
          if (ob) for (let i = 0; i < len; i++) occ[i] += ob[i];
        }
        out.push({ kind: "header", group: g, occ, top, height: GROUP_H });
        top += GROUP_H;
        if (isCollapsed) continue;
      }
      for (const room of g.units) {
        const list = byRoom.get(room.id) ?? [];
        const sorted = [...list].sort((a, b) =>
          a.check_in < b.check_in ? -1 : a.check_in > b.check_in ? 1 : 0,
        );
        const laneEnds: number[] = [];
        const placed = sorted.map((b) => {
          const s = dayIndex(parseISO(b.check_in));
          const e = dayIndex(parseISO(b.check_out));
          let lane = laneEnds.findIndex((end) => end <= s);
          if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(e);
          } else laneEnds[lane] = e;
          return { b, s, e, lane, conflict: false };
        });
        // У хостельных коек пересечения — норма (общая комната), не конфликт.
        if (!room.hostelBed)
          for (const p of placed) p.conflict = placed.some((q) => q !== p && q.s < p.e && p.s < q.e);
        const lanes = Math.max(1, laneEnds.length);
        const height = Math.max(MIN_ROW_H, lanes * LANE_H + 6);
        out.push({ kind: "row", room, placed: placed.map(({ b, lane, conflict }) => ({ b, lane, conflict })), top, height });
        top += height;
      }
    }
    rowLayoutRef.current = out
      .filter((i): i is Extract<Item, { kind: "row" }> => i.kind === "row")
      .map((r) => ({ roomId: r.room.id, top: r.top, height: r.height }));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, collapsed, byRoom, occByUnit, days, len]);

  // Drag handling via window listeners while a drag is active.
  useEffect(() => {
    if (!drag) return;
    const onMoveEvt = (e: PointerEvent) => {
      setPtr({ x: e.clientX, y: e.clientY });
      const dd = Math.round((e.clientX - drag.startX) / dayW);
      let roomId = drag.booking.room_id;
      let ci = drag.startCi;
      let co = drag.startCo;
      if (drag.mode === "move") {
        ci = addDays(drag.startCi, dd);
        co = addDays(drag.startCo, dd);
        const rect = bodyRef.current?.getBoundingClientRect();
        if (rect) {
          const y = e.clientY - rect.top;
          const row = rowLayoutRef.current.find((r) => y >= r.top && y < r.top + r.height);
          if (row) roomId = row.roomId;
        }
      } else if (drag.mode === "resize-l") {
        ci = addDays(drag.startCi, dd);
        if (differenceInCalendarDays(co, ci) < 1) ci = addDays(co, -1);
      } else {
        co = addDays(drag.startCo, dd);
        if (differenceInCalendarDays(co, ci) < 1) co = addDays(ci, 1);
      }
      const moved = dd !== 0 || roomId !== drag.booking.room_id;
      setDrag((d) => (d ? { ...d, preview: { roomId, ci, co }, moved } : d));
    };
    const onUp = () => {
      setPtr(null);
      setDrag((d) => {
        if (d?.moved) {
          const p = d.preview;
          onMove(d.booking, p.roomId, format(p.ci, "yyyy-MM-dd"), format(p.co, "yyyy-MM-dd"));
        } else if (d && d.mode === "move") {
          onOpen(d.booking);
        }
        return null;
      });
    };
    window.addEventListener("pointermove", onMoveEvt);
    window.addEventListener("pointerup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = drag.mode === "move" ? "grabbing" : "ew-resize";
    return () => {
      window.removeEventListener("pointermove", onMoveEvt);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [drag, onMove, onOpen, dayW]);

  function startDrag(e: React.PointerEvent, b: TBk, mode: DragMode) {
    if (e.button !== 0) return;
    e.stopPropagation();
    setDrag({
      mode,
      booking: b,
      startX: e.clientX,
      startCi: parseISO(b.check_in),
      startCo: parseISO(b.check_out),
      preview: { roomId: b.room_id, ci: parseISO(b.check_in), co: parseISO(b.check_out) },
      moved: false,
    });
  }

  const fullWidth = LABEL_W + len * dayW;

  return (
    <div ref={wrapRef} className="mt-6 overflow-x-auto border border-border bg-background text-xs">
      <div style={{ width: fullWidth }}>
        {/* Header */}
        <div className="sticky top-0 z-20 flex bg-cream/70">
          <div
            className="sticky left-0 z-10 shrink-0 border-b border-r border-border bg-cream/90 px-3 py-2 text-[10px] uppercase tracking-widest text-navy"
            style={{ width: LABEL_W }}
          >
            Номер
          </div>
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className={cn(
                "shrink-0 border-b border-border py-2 text-center text-[10px]",
                isSameDay(d, today) ? "bg-[#C9A96E]/20 text-navy" : "text-muted-foreground",
              )}
              style={{ width: dayW }}
            >
              <div>{format(d, "EEE", { locale: ru })}</div>
              <div className="font-mono text-sm text-navy">{format(d, "d")}</div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div ref={bodyRef} className="relative">
          {items.map((item) => {
            if (item.kind === "header") {
              const g = item.group;
              const total = g.units.length;
              const isCollapsed = collapsed.has(g.typeId);
              return (
                <div key={`h-${g.typeId}`} className="flex border-b border-border bg-cream/40" style={{ height: GROUP_H }}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.typeId)}
                    className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-border bg-cream/70 px-3 text-left text-navy hover:bg-cream"
                    style={{ width: LABEL_W }}
                    title={isCollapsed ? "Развернуть номера" : "Свернуть"}
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-navy text-cream text-[11px] font-black leading-none">
                      {isCollapsed ? "▸" : "▾"}
                    </span>
                    <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{g.groupName}</span>
                    <span className="ml-auto shrink-0 rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-bold text-navy">
                      {total}
                    </span>
                  </button>
                  <div className="relative flex" style={{ width: len * dayW }}>
                    {days.map((d) => {
                      const di = dayIndex(d);
                      const occ = item.occ[di] ?? 0;
                      const ratio = total > 0 ? Math.min(occ / total, 1) : 0;
                      return (
                        <div
                          key={d.toISOString()}
                          className={cn(
                            "relative flex h-full shrink-0 items-center justify-center overflow-hidden border-r border-border/60",
                            isSameDay(d, today) && "bg-[#C9A96E]/10",
                          )}
                          style={{ width: dayW }}
                          title={`${occ}/${total} занято`}
                        >
                          {occ > 0 && (
                            <>
                              <div
                                className={cn("absolute bottom-0 left-0 w-full", hostelBg(ratio))}
                                style={{ height: `${Math.round(ratio * 100)}%` }}
                              />
                              <span className={cn("relative z-10 text-[10px] font-bold", hostelText(ratio))}>
                                {occ}/{total}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Unit row
            const r = item;
            const isSingle = r.room.id === r.room.typeId; // одиночный тип (сам себе номер)
            return (
              <div
                key={r.room.id}
                data-roomid={r.room.id}
                className={cn(
                  "flex border-b border-border",
                  flashRoom === r.room.id && "bg-amber-100 ring-2 ring-inset ring-amber-400",
                )}
                style={{ height: r.height }}
              >
                <div
                  className={cn(
                    "sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-border px-3 text-navy",
                    isSingle ? "bg-cream/70" : "bg-background pl-7", // одиночный — выделенный прямоугольник; вложенный — с отступом
                  )}
                  style={{ width: LABEL_W }}
                >
                  <div className={cn("line-clamp-2", isSingle ? "text-[11px] font-semibold leading-tight" : "text-xs")}>
                    {r.room.unitLabel}
                  </div>
                  {isSingle && r.room.price_from_rub > 0 && (
                    <div className="mt-0.5 text-[10px] text-muted-foreground">от {r.room.price_from_rub} ₽</div>
                  )}
                </div>

                {/* Track */}
                <div className="relative" style={{ width: len * dayW }}>
                  <div className="absolute inset-0 flex">
                    {days.map((d) => {
                      const blocked = isBlocked(r.room.id, d);
                      return (
                        <div
                          key={d.toISOString()}
                          className={cn(
                            "h-full shrink-0 border-r border-border/70",
                            isSameDay(d, today) ? "bg-[#C9A96E]/10" : "hover:bg-cream/40",
                          )}
                          style={{ width: dayW }}
                          onClick={() => onCreate(r.room.id, d)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            onToggleBlock(r.room.id, format(d, "yyyy-MM-dd"));
                          }}
                        >
                          {blocked && (
                            <div
                              className="flex h-full w-full items-center justify-center bg-zinc-200"
                              style={{
                                backgroundImage:
                                  "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(0,0,0,0.08) 4px,rgba(0,0,0,0.08) 8px)",
                              }}
                              title="Заблокировано — техобслуживание"
                            >
                              <span className="text-[11px]">🚫</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Booking bars */}
                  {r.placed.map(({ b, lane, conflict }) => {
                    const left = clampIdx(dayIndex(parseISO(b.check_in))) * dayW;
                    const span =
                      clampIdx(dayIndex(parseISO(b.check_out))) - clampIdx(dayIndex(parseISO(b.check_in)));
                    const width = Math.max(0.5, span) * dayW - 3;
                    const dragging = drag?.booking.id === b.id && drag.moved;
                    const matched = searchActive ? (isMatch?.(b) ?? false) : false;
                    const dimmed = searchActive && !matched;
                    return (
                      <div
                        key={b.id}
                        className={cn(
                          "group absolute flex cursor-grab items-center gap-1 overflow-hidden rounded px-1 active:cursor-grabbing",
                          STATUS_BG[b.payment_status] ?? STATUS_BG.pending,
                          STATUS_TEXT[b.payment_status] ?? "text-white",
                          conflict && "ring-2 ring-inset ring-red-600",
                          dragging && "z-30 opacity-70 ring-2 ring-navy",
                          matched && "z-20 ring-2 ring-amber-400 ring-offset-1",
                          dimmed && "opacity-20",
                        )}
                        style={{ left: left + 1, width, top: lane * LANE_H + 3, height: LANE_H - 4 }}
                        title={`${b.last_name} ${b.first_name}`}
                        onPointerDown={(e) => startDrag(e, b, "move")}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onContext(b, e.clientX, e.clientY);
                        }}
                        onMouseEnter={(e) => onTooltip({ booking: b, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => onTooltip(null)}
                      >
                        <span
                          className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-black/0 hover:bg-black/20"
                          onPointerDown={(e) => startDrag(e, b, "resize-l")}
                        />
                        {conflict && <span className="text-[10px]">⚠</span>}
                        <span className="truncate text-[10px] font-bold leading-tight">
                          {b.last_name && b.last_name !== "—" ? b.last_name : "Гость"}
                        </span>
                        <span className="ml-auto shrink-0 text-[9px] opacity-70">
                          {SOURCE_ICON[b.source ?? "manual"] ?? "✏️"}
                        </span>
                        <span
                          className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-black/0 hover:bg-black/20"
                          onPointerDown={(e) => startDrag(e, b, "resize-r")}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Occupancy footer */}
          <div className="flex border-t-2 border-border bg-cream/40">
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-border bg-cream/80 px-3 py-2 text-[10px] uppercase tracking-widest text-navy"
              style={{ width: LABEL_W }}
            >
              Занято
            </div>
            {days.map((d) => {
              const di = dayIndex(d);
              const occupied = rooms.filter((room) => (occByUnit.get(room.id)?.[di] ?? 0) > 0).length;
              const pct = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0;
              const bg =
                pct === 0 ? "" : pct < 40 ? "bg-sky-200" : pct < 70 ? "bg-blue-400" : pct < 90 ? "bg-orange-400" : "bg-red-500";
              const txt = pct > 50 ? "text-white" : "text-navy";
              return (
                <div
                  key={d.toISOString()}
                  className={cn("shrink-0 border-r border-border py-2 text-center text-[10px] font-bold", bg, txt)}
                  style={{ width: dayW }}
                  title={`${occupied} из ${rooms.length} занято`}
                >
                  {occupied > 0 ? `${pct}%` : ""}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Плавающая подпись при перетаскивании */}
      {drag?.moved && ptr && (
        <div
          className="pointer-events-none fixed z-[120] whitespace-nowrap rounded bg-navy px-2 py-1 text-[11px] font-semibold text-cream shadow-lg"
          style={{ left: ptr.x + 14, top: ptr.y + 14 }}
        >
          {format(drag.preview.ci, "d MMM", { locale: ru })} — {format(drag.preview.co, "d MMM", { locale: ru })}
          {" · "}
          {rooms.find((r) => r.id === drag.preview.roomId)?.unitLabel ?? ""}
        </div>
      )}
    </div>
  );
}
