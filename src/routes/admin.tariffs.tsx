import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ROOMS } from "@/data/rooms";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { isHostelType, TARIFF_VYGODNY, TARIFFS, type RateBaseRow, type RateDayRow } from "@/lib/tariff";

export const Route = createFileRoute("/admin/tariffs")({
  component: AdminTariffsPage,
  head: () => ({
    meta: [
      { title: "Тарифы — Админка «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const WD = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const occLabel = (typeId: string, occ: number) => (isHostelType(typeId) ? "за место" : `${occ} осн.`);
const pad = (n: number) => String(n).padStart(2, "0");

function AdminTariffsPage() {
  const { isStaff, loading: authLoading } = useAuth();
  const year = 2026;
  const [tariff, setTariff] = useState(TARIFF_VYGODNY);
  const [month, setMonth] = useState(new Date().getMonth());
  const [baseMap, setBaseMap] = useState<Record<string, number>>({}); // type|occ -> price
  const [dayMap, setDayMap] = useState<Record<string, number>>({}); // type|occ|YYYY-MM-DD -> price
  const [occByType, setOccByType] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [month]);
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`),
    [daysInMonth, month],
  );

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const monthStart = `${year}-${pad(month + 1)}-01`;
      const monthEnd = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;
      const [{ data: base }, { data: day }] = await Promise.all([
        (supabase as any).from("rate_base").select("*").eq("tariff", tariff),
        (supabase as any).from("rate_day").select("*").eq("tariff", tariff).gte("date", monthStart).lte("date", monthEnd),
      ]);
      const bm: Record<string, number> = {};
      const occ: Record<string, Set<number>> = {};
      for (const r of (base as RateBaseRow[]) ?? []) {
        bm[`${r.room_type_id}|${r.occupancy}`] = r.price;
        (occ[r.room_type_id] ??= new Set()).add(r.occupancy);
      }
      const dm: Record<string, number> = {};
      for (const r of (day as RateDayRow[]) ?? []) dm[`${r.room_type_id}|${r.occupancy}|${r.date}`] = r.price;
      const occSorted: Record<string, number[]> = {};
      for (const t in occ) occSorted[t] = [...occ[t]].sort((a, b) => a - b);
      setBaseMap(bm);
      setDayMap(dm);
      setOccByType(occSorted);
      setLoading(false);
    })();
  }, [month, daysInMonth, tariff]);

  // строки: тип номера × уровни занятости (в порядке ROOMS)
  const rows = useMemo(
    () =>
      ROOMS.flatMap((r) => (occByType[r.id] ?? []).map((occ) => ({ typeId: r.id, name: r.name_ru, occ }))),
    [occByType],
  );

  async function saveDay(typeId: string, occ: number, date: string, value: number) {
    const baseVal = baseMap[`${typeId}|${occ}`] ?? 0;
    const key = `${typeId}|${occ}|${date}`;
    if (value === baseVal) {
      // равно базе — убираем переопределение
      setDayMap((m) => { const n = { ...m }; delete n[key]; return n; });
      await (supabase as any).from("rate_day").delete().eq("tariff", tariff).eq("room_type_id", typeId).eq("occupancy", occ).eq("date", date);
    } else {
      setDayMap((m) => ({ ...m, [key]: value }));
      const { error } = await (supabase as any).from("rate_day").upsert({ tariff, room_type_id: typeId, occupancy: occ, date, price: value });
      if (error) toast.error("Не удалось сохранить цену");
    }
  }

  async function saveBase(typeId: string, occ: number, value: number) {
    setBaseMap((m) => ({ ...m, [`${typeId}|${occ}`]: value }));
    const { error } = await (supabase as any).from("rate_base").upsert({ tariff, room_type_id: typeId, occupancy: occ, price: value });
    if (error) toast.error("Не удалось сохранить базовую цену");
  }

  if (authLoading) return null;
  if (!isStaff) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-serif text-3xl text-navy">Доступ только для сотрудников</h1>
        <p className="mt-4 text-sm text-muted-foreground">Войдите в кабинет, чтобы редактировать тарифы.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="px-6 py-10">
        <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">Управление ценами</p>
        <h1 className="mt-2 font-serif text-4xl text-navy">
          Тарифы · {TARIFFS.find((x) => x.id === tariff)?.name}
        </h1>

        {/* Переключатель тарифов */}
        <div className="mt-4 flex flex-wrap gap-2">
          {TARIFFS.map((tdef) => (
            <button
              key={tdef.id}
              onClick={() => setTariff(tdef.id)}
              className={`border px-4 py-2 text-left text-sm transition-colors ${
                tariff === tdef.id ? "border-navy bg-navy text-cream" : "border-border text-navy hover:border-navy"
              }`}
            >
              <div className="font-medium">{tdef.name}</div>
              <div className={`text-[10px] uppercase tracking-wide ${tariff === tdef.id ? "text-cream/70" : "text-muted-foreground"}`}>
                {tdef.note}
              </div>
            </button>
          ))}
        </div>

        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          {TARIFFS.find((x) => x.id === tariff)?.note}. «1 осн.» — если в номере один гость, «2 осн.» — если двое, и т.д.
          Колонка <b>База</b> — цена по умолчанию на все дни; ячейки дней — цена на конкретную дату
          (можно поднять/опустить). Очистите ячейку дня = вернуть к базовой.
        </p>

        {/* Вкладки месяцев */}
        <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              onClick={() => setMonth(i)}
              className={`px-3 py-2 text-xs ${month === i ? "border-b-2 border-navy font-semibold text-navy" : "text-muted-foreground hover:text-navy"}`}
            >
              {m}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Загрузка…</p>
        ) : (
          <div className="mt-4 overflow-x-auto border border-border">
            <table className="border-collapse text-xs" key={`${tariff}-${month}`}>
              <thead>
                <tr className="bg-cream">
                  <th className="sticky left-0 z-10 min-w-[230px] border-b border-r border-border bg-cream px-3 py-2 text-left text-navy">
                    {MONTHS[month]} {year}
                  </th>
                  <th className="border-b border-r border-border bg-cream px-2 py-2 text-navy">База</th>
                  {days.map((d, i) => {
                    const wd = new Date(d + "T00:00:00").getDay();
                    const weekend = wd === 0 || wd === 6;
                    return (
                      <th key={d} className={`border-b border-r border-border px-1 py-1 text-center font-normal ${weekend ? "bg-amber-50 text-amber-700" : "text-muted-foreground"}`}>
                        <div>{i + 1}</div>
                        <div className="text-[9px]">{WD[wd]}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const baseVal = baseMap[`${row.typeId}|${row.occ}`] ?? 0;
                  return (
                    <tr key={`${row.typeId}|${row.occ}`} className="even:bg-cream/30">
                      <td className="sticky left-0 z-10 border-b border-r border-border bg-background px-3 py-1.5 text-navy">
                        <span className="font-medium">{row.name}</span>
                        <span className="ml-1 text-muted-foreground">· {occLabel(row.typeId, row.occ)}</span>
                      </td>
                      <td className="border-b border-r border-border bg-cream/40 px-1 py-1">
                        <input
                          type="number"
                          defaultValue={baseVal || ""}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value, 10) || 0;
                            if (v !== baseVal) void saveBase(row.typeId, row.occ, v);
                          }}
                          className="w-16 bg-transparent text-center font-semibold text-navy outline-none focus:bg-white"
                        />
                      </td>
                      {days.map((d) => {
                        const dayVal = dayMap[`${row.typeId}|${row.occ}|${d}`];
                        const shown = dayVal ?? baseVal;
                        const overridden = dayVal != null && dayVal !== baseVal;
                        return (
                          <td key={d} className="border-b border-r border-border px-0.5 py-1">
                            <input
                              type="number"
                              defaultValue={shown || ""}
                              onBlur={(e) => {
                                const v = parseInt(e.target.value, 10) || 0;
                                if (v !== shown) void saveDay(row.typeId, row.occ, d, v);
                              }}
                              className={`w-14 bg-transparent text-center outline-none focus:bg-white ${overridden ? "font-semibold text-[#C9A96E]" : "text-muted-foreground"}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
