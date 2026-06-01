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
const HOSTEL_ROW_H = 56;
const LABEL_W = 184;

type Room = { id: string; name_ru: string; price_from_rub: number };

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
  bookings: TBk[]; // already status-filtered
  hostelCapacity: Record<string, number>;
  hostelBg: (ratio: number) => string;
  hostelText: (ratio: number) => string;
  isBlocked: (roomId: string, day: Date) => boolean;
  onToggleBlock: (roomId: string, dateStr: string) => void;
  onCreate: (roomId: string, day: Date) => void;
  onOpen: (b: TBk) => void;
  onContext: (b: TBk, x: number, y: number) => void;
  onTooltip: (t: { booking: TBk; x: number; y: number } | null) => void;
  onMove: (b: TBk, roomId: string, checkIn: string, checkOut: string) => void;
};

export function CalendarTimeline({
  rooms,
  days,
  bookings,
  hostelCapacity,
  hostelBg,
  hostelText,
  isBlocked,
  onToggleBlock,
  onCreate,
  onOpen,
  onContext,
  onTooltip,
  onMove,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const rowLayoutRef = useRef<{ roomId: string; top: number; height: number; hostel: boolean }[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);

  const len = days.length;
  const today = new Date();
  const dayIndex = (d: Date) => differenceInCalendarDays(d, days[0]);
  const clampIdx = (i: number) => Math.max(0, Math.min(len, i));

  // Apply the live drag preview to the dragged booking so the bar re-lays-out
  // in its target room/date as you drag — no separate ghost geometry needed.
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

  // Per-room lane assignment (so overlapping bookings stack and stay visible).
  const rows = useMemo(() => {
    let top = 0;
    const out = rooms.map((room) => {
      const hostel = Boolean(hostelCapacity[room.id]);
      const list = byRoom.get(room.id) ?? [];
      const sorted = [...list].sort((a, b) => (a.check_in < b.check_in ? -1 : a.check_in > b.check_in ? 1 : 0));
      const laneEnds: number[] = [];
      const placed = sorted.map((b) => {
        const s = dayIndex(parseISO(b.check_in));
        const e = dayIndex(parseISO(b.check_out)); // checkout day (exclusive of stay)
        let lane = laneEnds.findIndex((end) => end <= s);
        if (lane === -1) {
          lane = laneEnds.length;
          laneEnds.push(e);
        } else laneEnds[lane] = e;
        return { b, s, e, lane, conflict: false };
      });
      // conflict = overlaps any other bar in the same (regular) room
      if (!hostel)
        for (const p of placed) p.conflict = placed.some((q) => q !== p && q.s < p.e && p.s < q.e);
      const lanes = Math.max(1, laneEnds.length);
      const height = hostel ? HOSTEL_ROW_H : lanes * LANE_H + 6;
      const r = { room, hostel, list, placed, height, top };
      top += height;
      return r;
    });
    rowLayoutRef.current = out.map((r) => ({ roomId: r.room.id, top: r.top, height: r.height, hostel: r.hostel }));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byRoom, rooms, days, hostelCapacity]);

  // Drag handling via window listeners while a drag is active.
  useEffect(() => {
    if (!drag) return;
    const onMoveEvt = (e: PointerEvent) => {
      const dd = Math.round((e.clientX - drag.startX) / DAY_W);
      let roomId = drag.booking.room_id;
      let ci = drag.startCi;
      let co = drag.startCo;
      if (drag.mode === "move") {
        ci = addDays(drag.startCi, dd);
        co = addDays(drag.startCo, dd);
        const rect = bodyRef.current?.getBoundingClientRect();
        if (rect) {
          const y = e.clientY - rect.top;
          const row = rowLayoutRef.current.find((r) => y >= r.top && y < r.top + r.height && !r.hostel);
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
  }, [drag, onMove, onOpen]);

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

  const fullWidth = LABEL_W + len * DAY_W;

  return (
    <div className="mt-6 overflow-x-auto border border-border bg-background text-xs">
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
              style={{ width: DAY_W }}
            >
              <div>{format(d, "EEE", { locale: ru })}</div>
              <div className="font-mono text-sm text-navy">{format(d, "d")}</div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div ref={bodyRef} className="relative">
          {rows.map((r) => (
            <div key={r.room.id} className="flex border-b border-border" style={{ height: r.height }}>
              {/* Room label */}
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border bg-background px-3 py-1.5 align-top text-navy"
                style={{ width: LABEL_W }}
              >
                <div className="line-clamp-2 text-xs">{r.room.name_ru}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">от {r.room.price_from_rub} ₽</div>
              </div>

              {/* Track */}
              <div className="relative" style={{ width: len * DAY_W }}>
                {/* Background day cells (create / block / today) */}
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
                        style={{ width: DAY_W }}
                        onClick={() => !r.hostel && onCreate(r.room.id, d)}
                        onContextMenu={(e) => {
                          if (r.hostel) return;
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

                {/* Hostel: per-day bed counters */}
                {r.hostel &&
                  days.map((d) => {
                    const cap = hostelCapacity[r.room.id];
                    const occ = r.list
                      .filter((b) => {
                        const s = dayIndex(parseISO(b.check_in));
                        const e = dayIndex(parseISO(b.check_out));
                        const di = dayIndex(d);
                        return di >= s && di < e;
                      })
                      .reduce((sum, b) => sum + Math.max(1, b.adults ?? 1), 0);
                    if (occ === 0) return null;
                    const ratio = Math.min(occ / cap, 1);
                    const pct = Math.round(ratio * 100);
                    return (
                      <div
                        key={d.toISOString()}
                        className="absolute top-0 flex h-full flex-col items-center justify-center overflow-hidden"
                        style={{ left: clampIdx(dayIndex(d)) * DAY_W, width: DAY_W }}
                      >
                        <div className={cn("absolute bottom-0 left-0 w-full", hostelBg(ratio))} style={{ height: `${pct}%` }} />
                        <span className={cn("relative z-10 text-[11px] font-bold", hostelText(ratio))}>
                          {occ}/{cap}
                        </span>
                      </div>
                    );
                  })}

                {/* Regular room: booking bars */}
                {!r.hostel &&
                  r.placed.map(({ b, lane, conflict }) => {
                    const left = clampIdx(dayIndex(parseISO(b.check_in))) * DAY_W;
                    const span = clampIdx(dayIndex(parseISO(b.check_out))) - clampIdx(dayIndex(parseISO(b.check_in)));
                    const width = Math.max(0.5, span) * DAY_W - 3;
                    const dragging = drag?.booking.id === b.id && drag.moved;
                    return (
                      <div
                        key={b.id}
                        className={cn(
                          "group absolute flex cursor-grab items-center gap-1 overflow-hidden rounded px-1 active:cursor-grabbing",
                          STATUS_BG[b.payment_status] ?? STATUS_BG.pending,
                          STATUS_TEXT[b.payment_status] ?? "text-white",
                          conflict && "ring-2 ring-inset ring-red-600",
                          dragging && "z-30 opacity-70 ring-2 ring-navy",
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
                        {/* Left resize handle */}
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
                        {/* Right resize handle */}
                        <span
                          className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-black/0 hover:bg-black/20"
                          onPointerDown={(e) => startDrag(e, b, "resize-r")}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

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
              const occupied = rooms.filter((room) =>
                (byRoom.get(room.id) ?? []).some((b) => {
                  const s = dayIndex(parseISO(b.check_in));
                  const e = dayIndex(parseISO(b.check_out));
                  return di >= s && di < e;
                }),
              ).length;
              const pct = Math.round((occupied / rooms.length) * 100);
              const bg =
                pct === 0 ? "" : pct < 40 ? "bg-sky-200" : pct < 70 ? "bg-blue-400" : pct < 90 ? "bg-orange-400" : "bg-red-500";
              const txt = pct > 50 ? "text-white" : "text-navy";
              return (
                <div
                  key={d.toISOString()}
                  className={cn("shrink-0 border-r border-border py-2 text-center text-[10px] font-bold", bg, txt)}
                  style={{ width: DAY_W }}
                  title={`${occupied} из ${rooms.length} номеров занято`}
                >
                  {occupied > 0 ? `${pct}%` : ""}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
