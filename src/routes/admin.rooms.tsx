import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ROOMS } from "@/data/rooms";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export const Route = createFileRoute("/admin/rooms")({
  component: AdminRoomsPage,
  head: () => ({
    meta: [
      { title: "Номера — Админка «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type RoomStats = {
  upcoming: number;
  nextCheckIn: string | null;
  occupiedToday: boolean;
};

function AdminRoomsPage() {
  const [stats, setStats] = useState<Record<string, RoomStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("bookings")
      .select("room_id, check_in, check_out, payment_status")
      .gte("check_out", today)
      .neq("payment_status", "cancelled");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    const map: Record<string, RoomStats> = {};
    for (const r of ROOMS) {
      const rows = (data ?? []).filter((b) => b.room_id === r.id);
      const upcoming = rows.length;
      const sorted = rows
        .map((r) => r.check_in)
        .sort();
      const nextCheckIn = sorted[0] ?? null;
      const occupiedToday = rows.some(
        (b) => b.check_in <= today && b.check_out > today,
      );
      map[r.id] = { upcoming, nextCheckIn, occupiedToday };
    }
    setStats(map);
    setLoading(false);
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">
            Каталог
          </p>
          <h1 className="mt-2 font-serif text-4xl text-navy">Номера отеля</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ROOMS.length} номеров. Контент номеров редактируется в коде (
            <code className="text-xs">src/data/rooms.ts</code>).
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ROOMS.map((r) => {
            const s = stats[r.id];
            return (
              <article
                key={r.id}
                className="flex flex-col gap-3 border border-border bg-background p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg leading-tight text-navy">
                      {r.name_ru}
                    </h2>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      ID: {r.id}
                    </p>
                  </div>
                  {s?.occupiedToday && (
                    <span className="shrink-0 border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] uppercase tracking-widest text-rose-700">
                      Занят сегодня
                    </span>
                  )}
                </div>

                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <Stat label="Гостей" value={r.max_guests.toString()} />
                  <Stat label="Площадь" value={`${r.area_sqm} м²`} />
                  <Stat
                    label="Цена"
                    value={r.price_from_rub > 0 ? `${r.price_from_rub} ₽` : "—"}
                  />
                </dl>

                <p className="line-clamp-3 text-xs text-muted-foreground">
                  {r.description_ru}
                </p>

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs">
                  <span className="text-muted-foreground">
                    Активных броней: <span className="text-navy">{s?.upcoming ?? 0}</span>
                  </span>
                  {s?.nextCheckIn && (
                    <span className="text-muted-foreground">
                      След. заезд:{" "}
                      <span className="text-navy">
                        {format(parseISO(s.nextCheckIn), "d MMM", { locale: ru })}
                      </span>
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {loading && (
          <p className="mt-6 text-center text-sm text-muted-foreground">Загрузка статистики…</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-cream/40 px-2 py-1">
      <dt className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="text-sm text-navy">{value}</dd>
    </div>
  );
}
