import type { Room } from "@/data/rooms";
import { AMENITY_BY_KEY } from "@/data/amenities";
import type { PricePeriod } from "@/lib/custom-rooms";

// Переопределения встроенных номеров (фото/цены/характеристики), которые Шеф
// меняет из кабинета. Хранятся в room_overrides (ключ — id типа из ROOMS).
export type RoomOverrideRow = {
  type_id: string;
  description: string;
  area_sqm: number | null;
  max_guests: number | null;
  beds: string;
  amenities: string[];
  photos: string[];
  price_periods: PricePeriod[];
  base_price: number;
};

// "ДД.ММ" → порядковое число ММДД (для сравнения дат без года).
function ddmmToOrd(s: string): number | null {
  const m = /^(\d{1,2})\.(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return mo * 100 + d;
}

function isoToOrd(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return Number(m[2]) * 100 + Number(m[3]);
}

// Цена за ночь для конкретной даты заезда с учётом сезонных периодов.
// Периоды могут «переходить» через Новый год (from > to).
export function priceForDate(
  periods: PricePeriod[] | undefined,
  basePrice: number,
  checkInISO: string,
  fallback: number,
): number {
  const x = isoToOrd(checkInISO);
  if (x != null) {
    for (const p of periods ?? []) {
      const price = Number(p.price) || 0;
      if (price <= 0) continue;
      const from = ddmmToOrd(p.from);
      const to = ddmmToOrd(p.to);
      if (from == null || to == null) continue;
      const inRange = from <= to ? x >= from && x < to : x >= from || x < to;
      if (inRange) return price;
    }
  }
  if (basePrice > 0) return basePrice;
  return fallback;
}

// Минимальная цена «от» (для карточки): мин. из периодов, иначе base, иначе дефолт.
export function minOverridePrice(ov: Pick<RoomOverrideRow, "price_periods" | "base_price">, fallback: number): number {
  const prices = (ov.price_periods ?? []).map((p) => Number(p.price) || 0).filter((p) => p > 0);
  if (prices.length) return Math.min(...prices);
  if (ov.base_price > 0) return ov.base_price;
  return fallback;
}

// Сливает переопределение в объект Room (для витрины/виджета). Пустые поля
// переопределения — берём из исходного ROOM.
export function mergeRoomOverride(room: Room, ov?: RoomOverrideRow | null): Room {
  if (!ov) return room;
  const hasAmenities = (ov.amenities ?? []).length > 0;
  const quick = hasAmenities
    ? (ov.amenities ?? []).map((k) => AMENITY_BY_KEY[k]).filter(Boolean).slice(0, 6).map((a) => ({ icon: a.icon, label: a.label }))
    : room.quick_amenities;
  const amenities_categories = hasAmenities
    ? [{ label: "Удобства", items: (ov.amenities ?? []).map((k) => AMENITY_BY_KEY[k]?.label).filter(Boolean) as string[] }]
    : room.amenities_categories;
  return {
    ...room,
    description_ru: ov.description?.trim() ? ov.description : room.description_ru,
    area_sqm: ov.area_sqm ?? room.area_sqm,
    max_guests: ov.max_guests ?? room.max_guests,
    max_adults: ov.max_guests ?? room.max_adults,
    beds: ov.beds?.trim() ? ov.beds : room.beds,
    price_from_rub: minOverridePrice(ov, room.price_from_rub),
    photos: (ov.photos ?? []).length ? ov.photos : room.photos,
    quick_amenities: quick,
    amenities_categories,
  };
}

// Карта override по type_id (из выборки room_overrides).
export function overridesMap(rows: RoomOverrideRow[] | null | undefined): Record<string, RoomOverrideRow> {
  const m: Record<string, RoomOverrideRow> = {};
  for (const r of rows ?? []) m[r.type_id] = r;
  return m;
}
