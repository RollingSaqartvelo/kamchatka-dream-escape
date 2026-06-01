import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
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
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ROOMS } from "@/data/rooms";
import { sourceLabel, sourceColor } from "@/lib/channels";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

type Bk = {
  id: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_price: number;
  room_price_total: number;
  payment_status: string;
  source: string | null;
  created_at: string;
};

export type Metrics = {
  occupiedNights: number;
  availableNights: number;
  occupancyPct: number;
  adr: number;
  revpar: number;
  bookedRevenue: number;
  leadAvg: number;
  avgStay: number;
  cancelRate: number;
  arrivalsActive: number;
  trend: { day: string; pct: number }[];
  channels: { src: string; label: string; count: number; revenue: number }[];
};

const ROOM_COUNT = ROOMS.length;
const fmtRub = (n: number) => "₽ " + new Intl.NumberFormat("ru-RU").format(Math.round(n));

export function computeMetrics(bookings: Bk[], monthStart: Date, monthEnd: Date, days: Date[]): Metrics {
  const inMonth = (d: Date) => d >= monthStart && d <= monthEnd;
  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
  const availableNights = ROOM_COUNT * days.length;

  const dayOcc = new Map<string, number>();
  days.forEach((d) => dayOcc.set(dayKey(d), 0));

  let occupiedNights = 0;
  let roomRevenue = 0;
  let bookedRevenue = 0;
  let leadSum = 0;
  let arrivalsActive = 0;
  let arrivalsAll = 0;
  let cancelled = 0;
  let nightsSum = 0;
  const channel = new Map<string, { count: number; revenue: number }>();

  for (const b of bookings) {
    const ci = parseISO(b.check_in);
    const co = parseISO(b.check_out);
    const nights = Math.max(1, b.nights || differenceInCalendarDays(co, ci) || 1);
    const isCancelled = b.payment_status === "cancelled";

    if (!isCancelled) {
      const perRoomNight = b.room_price_total > 0 ? b.room_price_total / nights : b.total_price / nights;
      for (let i = 0; i < nights; i++) {
        const d = new Date(ci.getTime() + i * 86400000);
        if (inMonth(d)) {
          occupiedNights++;
          roomRevenue += perRoomNight;
          const k = dayKey(d);
          dayOcc.set(k, (dayOcc.get(k) ?? 0) + 1);
        }
      }
    }

    if (inMonth(ci)) {
      arrivalsAll++;
      if (isCancelled) {
        cancelled++;
      } else {
        arrivalsActive++;
        bookedRevenue += b.total_price;
        nightsSum += nights;
        leadSum += Math.max(0, differenceInCalendarDays(ci, parseISO(b.created_at)));
        const src = b.source ?? "manual";
        const cur = channel.get(src) ?? { count: 0, revenue: 0 };
        cur.count++;
        cur.revenue += b.total_price;
        channel.set(src, cur);
      }
    }
  }

  return {
    occupiedNights,
    availableNights,
    occupancyPct: availableNights > 0 ? (occupiedNights / availableNights) * 100 : 0,
    adr: occupiedNights > 0 ? roomRevenue / occupiedNights : 0,
    revpar: availableNights > 0 ? roomRevenue / availableNights : 0,
    bookedRevenue,
    leadAvg: arrivalsActive > 0 ? leadSum / arrivalsActive : 0,
    avgStay: arrivalsActive > 0 ? nightsSum / arrivalsActive : 0,
    cancelRate: arrivalsAll > 0 ? (cancelled / arrivalsAll) * 100 : 0,
    arrivalsActive,
    trend: days.map((d) => ({
      day: format(d, "d"),
      pct: Math.round(((dayOcc.get(dayKey(d)) ?? 0) / ROOM_COUNT) * 100),
    })),
    channels: [...channel.entries()]
      .map(([src, v]) => ({ src, label: sourceLabel(src), ...v }))
      .sort((a, b) => b.count - a.count),
  };
}

function Dashboard() {
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [bookings, setBookings] = useState<Bk[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStart = anchor;
  const monthEnd = endOfMonth(anchor);
  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [anchor]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("id, check_in, check_out, nights, total_price, room_price_total, payment_status, source, created_at")
        .lte("check_in", format(monthEnd, "yyyy-MM-dd"))
        .gte("check_out", format(monthStart, "yyyy-MM-dd"));
      if (!active) return;
      if (error) console.error(error);
      setBookings((data as Bk[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [anchor]);

  const m = useMemo(() => computeMetrics(bookings, monthStart, monthEnd, days), [bookings, days, monthStart, monthEnd]);

  return (
    <DashboardView
      anchor={anchor}
      m={m}
      loading={loading}
      onPrev={() => setAnchor(subMonths(anchor, 1))}
      onNext={() => setAnchor(addMonths(anchor, 1))}
      onToday={() => setAnchor(startOfMonth(new Date()))}
    />
  );
}

export function DashboardView({
  anchor,
  m,
  loading,
  onPrev,
  onNext,
  onToday,
}: {
  anchor: Date;
  m: Metrics;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">Аналитика</p>
            <h1 className="mt-2 font-serif text-4xl text-navy">Дашборд</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onPrev} className="border border-border px-3 py-2 text-sm hover:border-navy">←</button>
            <div className="min-w-40 text-center font-serif text-lg capitalize text-navy">
              {format(anchor, "LLLL yyyy", { locale: ru })}
            </div>
            <button onClick={onNext} className="border border-border px-3 py-2 text-sm hover:border-navy">→</button>
            <button onClick={onToday} className="border border-border px-3 py-2 text-[10px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream">Текущий</button>
          </div>
        </div>

        {loading ? (
          <div className="mt-10 py-20 text-center text-muted-foreground">Загрузка…</div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon="💰" label="Выручка (заезды месяца)" value={fmtRub(m.bookedRevenue)} />
              <Kpi icon="📊" label="Заполняемость" value={`${Math.round(m.occupancyPct)}%`} hint={`${m.occupiedNights} из ${m.availableNights} ночей`} />
              <Kpi icon="🏷️" label="ADR · средняя цена ночи" value={fmtRub(m.adr)} hint="по проданным ночам" />
              <Kpi icon="📈" label="RevPAR · доход на номер" value={fmtRub(m.revpar)} hint="на каждый номер в сутки" />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon="🧾" label="Заездов" value={String(m.arrivalsActive)} small />
              <Kpi icon="🌙" label="Ср. длительность" value={`${m.avgStay.toFixed(1)} ноч.`} small />
              <Kpi icon="⏱️" label="Lead time" value={`${Math.round(m.leadAvg)} дн.`} hint="бронируют заранее" small />
              <Kpi icon="❌" label="Отмены" value={`${Math.round(m.cancelRate)}%`} small />
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-3">
              <div className="rounded border border-border bg-background p-5 lg:col-span-2">
                <p className="mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">Заполняемость по дням, %</p>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={m.trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="occ" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C9A96E" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#C9A96E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={2} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <RTooltip formatter={(v: number) => [`${v}%`, "Занято"]} labelFormatter={(l) => `День ${l}`} />
                    <Area type="monotone" dataKey="pct" stroke="#C9A96E" strokeWidth={2} fill="url(#occ)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded border border-border bg-background p-5">
                <p className="mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">Источники броней</p>
                {m.channels.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Нет заездов в этом месяце</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={m.channels} dataKey="count" nameKey="label" innerRadius={45} outerRadius={70} paddingAngle={2}>
                          {m.channels.map((c, i) => (
                            <Cell key={c.src} fill={sourceColor(c.src, i)} />
                          ))}
                        </Pie>
                        <RTooltip formatter={(v: number, _n, p: any) => [`${v} (${fmtRub(p.payload.revenue)})`, p.payload.label]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5">
                      {m.channels.map((c, i) => (
                        <div key={c.src} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-navy">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: sourceColor(c.src, i) }} />
                            {c.label}
                          </span>
                          <span className="text-muted-foreground">{c.count} · {fmtRub(c.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  small,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded border border-border bg-cream/30 px-4 py-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{icon} {label}</p>
      <p className={`mt-1 font-serif text-navy ${small ? "text-xl" : "text-2xl"}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
