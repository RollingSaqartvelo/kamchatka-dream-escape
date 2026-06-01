import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format, startOfMonth, startOfYear } from "date-fns";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { sourceLabel, sourceColor } from "@/lib/channels";

export const Route = createFileRoute("/admin/analytics")({ component: AnalyticsPage });

export type ABk = {
  source: string | null;
  payment_status: string;
  total_price: number;
  nights: number;
  adults: number;
  children: number;
  check_in: string;
};

export type ChannelRow = {
  slug: string;
  label: string;
  bookings: number;
  guests: number;
  nights: number;
  revenue: number;
  adr: number;
  sharePct: number;
};

const fmtRub = (n: number) => "₽ " + new Intl.NumberFormat("ru-RU").format(Math.round(n));

export function aggregateChannels(rows: ABk[], fromISO?: string): ChannelRow[] {
  const m = new Map<string, ChannelRow>();
  let totalRev = 0;
  for (const b of rows) {
    if (b.payment_status === "cancelled") continue;
    if (fromISO && b.check_in < fromISO) continue;
    const slug = b.source ?? "travelline";
    const e =
      m.get(slug) ?? { slug, label: sourceLabel(slug), bookings: 0, guests: 0, nights: 0, revenue: 0, adr: 0, sharePct: 0 };
    e.bookings++;
    e.guests += (b.adults ?? 0) + (b.children ?? 0);
    e.nights += b.nights ?? 0;
    e.revenue += b.total_price ?? 0;
    m.set(slug, e);
    totalRev += b.total_price ?? 0;
  }
  return [...m.values()]
    .map((e) => ({ ...e, adr: e.nights ? e.revenue / e.nights : 0, sharePct: totalRev ? (e.revenue / totalRev) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
}

type Period = "month" | "year" | "all";

function AnalyticsPage() {
  const [rows, setRows] = useState<ABk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("source, payment_status, total_price, nights, adults, children, check_in")
        .limit(5000);
      if (!active) return;
      if (error) console.error(error);
      setRows((data as ABk[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return <AnalyticsView rows={rows} loading={loading} />;
}

export function AnalyticsView({ rows, loading }: { rows: ABk[]; loading: boolean }) {
  const [period, setPeriod] = useState<Period>("year");

  const fromISO = useMemo(() => {
    const now = new Date();
    if (period === "month") return format(startOfMonth(now), "yyyy-MM-dd");
    if (period === "year") return format(startOfYear(now), "yyyy-MM-dd");
    return undefined;
  }, [period]);

  const channels = useMemo(() => aggregateChannels(rows, fromISO), [rows, fromISO]);
  const totals = channels.reduce(
    (a, c) => ({ bookings: a.bookings + c.bookings, guests: a.guests + c.guests, revenue: a.revenue + c.revenue }),
    { bookings: 0, guests: 0, revenue: 0 },
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">Источники броней</p>
            <h1 className="mt-2 font-serif text-4xl text-navy">Аналитика каналов</h1>
          </div>
          <div className="flex rounded border border-border overflow-hidden text-[11px] uppercase tracking-widest">
            {(["month", "year", "all"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 ${period === p ? "bg-navy text-cream" : "text-navy hover:bg-cream/40"}`}
              >
                {p === "month" ? "Месяц" : p === "year" ? "Год" : "Всё время"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-10 py-20 text-center text-muted-foreground">Загрузка…</div>
        ) : channels.length === 0 ? (
          <div className="mt-10 py-20 text-center text-muted-foreground">Нет броней за выбранный период</div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi icon="🌐" label="Каналов" value={String(channels.length)} />
              <Kpi icon="🧾" label="Броней" value={String(totals.bookings)} />
              <Kpi icon="👥" label="Гостей" value={String(totals.guests)} />
              <Kpi icon="💰" label="Выручка" value={fmtRub(totals.revenue)} />
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {/* Revenue by channel */}
              <div className="rounded border border-border bg-background p-5">
                <p className="mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">Выручка по каналам</p>
                <ResponsiveContainer width="100%" height={Math.max(180, channels.length * 44)}>
                  <BarChart data={channels} layout="vertical" margin={{ left: 30, right: 16 }}>
                    <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                    <RTooltip formatter={(v: number) => fmtRub(v)} />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {channels.map((c, i) => (
                        <Cell key={c.slug} fill={sourceColor(c.slug, i)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded border border-border bg-background">
                <table className="min-w-full text-sm">
                  <thead className="bg-cream/50 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Канал</th>
                      <th className="px-3 py-3 text-center">Броней</th>
                      <th className="px-3 py-3 text-center">Гостей</th>
                      <th className="px-3 py-3 text-right">Выручка</th>
                      <th className="px-3 py-3 text-right">ADR</th>
                      <th className="px-3 py-3 text-right">Доля</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((c, i) => (
                      <tr key={c.slug} className="border-t border-border">
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2 text-navy">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: sourceColor(c.slug, i) }} />
                            {c.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-navy">{c.bookings}</td>
                        <td className="px-3 py-3 text-center text-muted-foreground">{c.guests}</td>
                        <td className="px-3 py-3 text-right font-serif text-navy">{fmtRub(c.revenue)}</td>
                        <td className="px-3 py-3 text-right text-muted-foreground">{fmtRub(c.adr)}</td>
                        <td className="px-3 py-3 text-right text-muted-foreground">{Math.round(c.sharePct)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-cream/30 px-4 py-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{icon} {label}</p>
      <p className="mt-1 font-serif text-2xl text-navy">{value}</p>
    </div>
  );
}
