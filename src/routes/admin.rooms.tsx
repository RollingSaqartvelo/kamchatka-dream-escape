import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ROOMS } from "@/data/rooms";
import { MANAGED_ROOMS, MANAGED_BY_TYPE } from "@/data/room-units";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/rooms")({
  component: AdminRoomsPage,
  head: () => ({
    meta: [
      { title: "Номера — Админка «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AdminRoomsPage() {
  const [maint, setMaint] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("room_maintenance")
      .select("room_key");
    if (error) console.error(error);
    else setMaint(new Set((data ?? []).map((r: { room_key: string }) => r.room_key)));
    setLoading(false);
  }

  async function toggle(key: string, label: string) {
    const inMaint = maint.has(key);
    // optimistic
    setMaint((prev) => {
      const next = new Set(prev);
      inMaint ? next.delete(key) : next.add(key);
      return next;
    });
    if (inMaint) {
      const { error } = await (supabase as any).from("room_maintenance").delete().eq("room_key", key);
      if (error) {
        toast.error("Не удалось вернуть в работу");
        void load();
      } else toast.success(`${label} — снова в работе`);
    } else {
      const { error } = await (supabase as any).from("room_maintenance").insert({ room_key: key });
      if (error) {
        toast.error("Не удалось отправить в ремонт");
        void load();
      } else toast.success(`${label} — отправлен в ремонт 🛠`);
    }
  }

  const inMaintCount = MANAGED_ROOMS.filter((m) => maint.has(m.key)).length;
  const activeCount = MANAGED_ROOMS.length - inMaintCount;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">Управление</p>
          <h1 className="mt-2 font-serif text-4xl text-navy">Номера отеля</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {MANAGED_ROOMS.length} физических номеров · {ROOMS.length} типов.
            Номер «в ремонте» снимается с продажи и скрывается в календаре.
          </p>
        </div>

        {/* KPI */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Kpi label="Всего номеров" value={String(MANAGED_ROOMS.length)} />
          <Kpi label="В работе" value={String(activeCount)} tone="ok" />
          <Kpi label="В ремонте" value={String(inMaintCount)} tone={inMaintCount ? "warn" : undefined} />
        </div>

        {/* Все физические номера */}
        <h2 className="mt-10 font-serif text-2xl text-navy">Все номера</h2>
        <div className="mt-4 space-y-6">
          {MANAGED_BY_TYPE.filter((g) => g.rooms.length > 0).map((g) => (
            <div key={g.typeId}>
              <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                {g.groupName} · {g.rooms.length}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {g.rooms.map((m) => {
                  const inMaint = maint.has(m.key);
                  return (
                    <div
                      key={m.key}
                      className={`flex items-center justify-between gap-2 border px-3 py-2.5 text-sm ${
                        inMaint ? "border-amber-400 bg-amber-50" : "border-border bg-background"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-navy">
                          {m.hostel ? "Весь номер" : m.label}
                          {m.hostel && m.beds ? <span className="text-muted-foreground"> · {m.beds} коек</span> : null}
                        </div>
                        <div className={`text-[10px] uppercase tracking-wide ${inMaint ? "text-amber-700" : "text-emerald-700"}`}>
                          {inMaint ? "🛠 В ремонте" : "● В работе"}
                        </div>
                      </div>
                      <button
                        onClick={() => void toggle(m.key, m.hostel ? g.groupName : m.label)}
                        title={inMaint ? "Вернуть в работу" : "Отправить в ремонт"}
                        className={`shrink-0 rounded px-2 py-1 text-[10px] uppercase tracking-widest transition-colors ${
                          inMaint
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "border border-amber-400 text-amber-700 hover:bg-amber-100"
                        }`}
                      >
                        {inMaint ? "В работу" : "В ремонт"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {loading && <p className="mt-4 text-sm text-muted-foreground">Загрузка статусов…</p>}

        {/* Типы номеров (контент) */}
        <h2 className="mt-12 font-serif text-2xl text-navy">Типы номеров</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {ROOMS.length} видов. Контент редактируется в коде (<code className="text-xs">src/data/rooms.ts</code>).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ROOMS.map((r) => (
            <article key={r.id} className="flex flex-col gap-3 border border-border bg-background p-5">
              <div>
                <h3 className="font-serif text-lg leading-tight text-navy">{r.name_ru}</h3>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">ID: {r.id}</p>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-xs">
                <Stat label="Гостей" value={r.max_guests.toString()} />
                <Stat label="Площадь" value={`${r.area_sqm} м²`} />
                <Stat label="Цена" value={r.price_from_rub > 0 ? `${r.price_from_rub} ₽` : "—"} />
              </dl>
              <p className="line-clamp-3 text-xs text-muted-foreground">{r.description_ru}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const color = tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-navy";
  return (
    <div className="rounded border border-border bg-cream/30 px-4 py-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 font-serif text-2xl ${color}`}>{value}</p>
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
