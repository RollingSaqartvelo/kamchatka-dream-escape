import type { Room } from "@/data/rooms";
import { AMENITY_BY_KEY } from "@/data/amenities";

export type PricePeriod = { from: string; to: string; price: number };

export type CustomRoomRow = {
  id: string;
  name: string;
  price: number;
  description: string;
  area_sqm: number | null;
  max_guests: number | null;
  beds: string;
  amenities: string[];
  photos: string[];
  price_periods: PricePeriod[];
  published: boolean;
};

// Минимальная цена из сезонных периодов (или базовая price), 0 если ничего.
export function customRoomMinPrice(c: Pick<CustomRoomRow, "price" | "price_periods">): number {
  const prices = (c.price_periods ?? []).map((p) => Number(p.price) || 0).filter((p) => p > 0);
  if (prices.length) return Math.min(...prices);
  return Number(c.price) || 0;
}

// Превращает строку custom_rooms в объект Room для публичной карточки (RoomCard).
export function customRoomToRoom(c: CustomRoomRow): Room {
  const quick = (c.amenities ?? [])
    .map((k) => AMENITY_BY_KEY[k])
    .filter(Boolean)
    .slice(0, 6)
    .map((a) => ({ icon: a.icon, label: a.label }));
  const items = (c.amenities ?? [])
    .map((k) => AMENITY_BY_KEY[k]?.label)
    .filter(Boolean) as string[];
  return {
    id: `custom-${c.id}`,
    name_ru: c.name,
    max_guests: c.max_guests ?? 2,
    max_adults: c.max_guests ?? 2,
    area_sqm: c.area_sqm ?? 0,
    rooms_count: 1,
    beds: c.beds || "",
    price_from_rub: customRoomMinPrice(c),
    quick_amenities: quick,
    description_ru: c.description || "",
    amenities_categories: items.length ? [{ label: "Удобства", items }] : [],
    photos: c.photos ?? [],
  };
}
