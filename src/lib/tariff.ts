// Тариф «Выгодный»: цена за ночь зависит от типа номера, даты и числа гостей
// («осн. мест»: 1 гость дешевле, 2 — дороже и т.д.). Без питания и доп. места.
// Источник цен — таблицы rate_base (база на все дни) и rate_day (правки по дням).

export type RateBaseRow = { tariff: string; room_type_id: string; occupancy: number; price: number };
export type RateDayRow = { tariff: string; room_type_id: string; occupancy: number; date: string; price: number };

export const TARIFF_VYGODNY = "vygodny";

// Реестр тарифов. board: none — без питания; full — полный пансион (завтрак+обед+ужин).
export type TariffDef = { id: string; name: string; board: "none" | "full"; note: string };
export const TARIFFS: TariffDef[] = [
  { id: "vygodny", name: "Выгодный", board: "none", note: "Без питания" },
  { id: "vygodnoe_predlozhenie", name: "Выгодное предложение", board: "full", note: "Полный пансион (завтрак, обед, ужин)" },
];

// Койко-места (хостел) тарифицируются за место × число гостей; остальные — за номер.
export function isHostelType(typeId: string): boolean {
  return typeId.startsWith("hostel");
}

export type RateMaps = {
  base: Record<string, number>; // `${type}|${occ}` -> price
  day: Record<string, number>; // `${type}|${occ}|${date}` -> price
  occByType: Record<string, number[]>; // type -> отсортированные уровни занятости
};

export function buildRateMaps(baseRows: RateBaseRow[] | null, dayRows: RateDayRow[] | null): RateMaps {
  const base: Record<string, number> = {};
  const occSets: Record<string, Set<number>> = {};
  for (const r of baseRows ?? []) {
    base[`${r.room_type_id}|${r.occupancy}`] = r.price;
    (occSets[r.room_type_id] ??= new Set()).add(r.occupancy);
  }
  const day: Record<string, number> = {};
  for (const r of dayRows ?? []) day[`${r.room_type_id}|${r.occupancy}|${r.date}`] = r.price;
  const occByType: Record<string, number[]> = {};
  for (const t in occSets) occByType[t] = [...occSets[t]].sort((a, b) => a - b);
  return { base, day, occByType };
}

// Уровень занятости для N гостей у типа (ограничен доступными уровнями).
function levelFor(maps: RateMaps, typeId: string, guests: number): number {
  const levels = maps.occByType[typeId] ?? [1];
  const max = levels.length ? Math.max(...levels) : 1;
  return Math.min(Math.max(1, guests), max);
}

// Цена за одну ночь конкретной даты для N гостей.
export function nightlyPrice(maps: RateMaps, typeId: string, dateISO: string, guests: number): number {
  if (isHostelType(typeId)) {
    const per = maps.day[`${typeId}|1|${dateISO}`] ?? maps.base[`${typeId}|1`] ?? 0;
    return per * Math.max(1, guests); // за число коек
  }
  const occ = levelFor(maps, typeId, guests);
  return maps.day[`${typeId}|${occ}|${dateISO}`] ?? maps.base[`${typeId}|${occ}`] ?? 0;
}

// Сумма за проживание (по ночам check_in … check_out).
export function stayTotal(maps: RateMaps, typeId: string, checkIn: string, checkOut: string, guests: number): number {
  let total = 0;
  const d = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  let guard = 0;
  while (d < end && guard < 400) {
    total += nightlyPrice(maps, typeId, d.toISOString().slice(0, 10), guests);
    d.setUTCDate(d.getUTCDate() + 1);
    guard++;
  }
  return total;
}

// Цена «от» для карточки: минимальная базовая (1 гость / 1 место).
export function fromPrice(maps: RateMaps, typeId: string): number {
  return maps.base[`${typeId}|1`] ?? 0;
}
