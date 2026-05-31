import type { Room } from "@/data/rooms";

export type GuestParty = {
  adults: number;
  children: number;
};

export type DateRange = {
  from?: Date;
  to?: Date;
};

export type MealPlan = "room_only" | "breakfast";

export type SelectedRate = {
  room: Room;
  mealPlan: MealPlan;
};

export type GuestInfo = {
  salutation: "mr" | "mrs" | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  country: string;
};

export type MessengerChoice = {
  type: "telegram" | "vk_max" | "none";
  username: string;
};

export type BookingState = {
  step: 1 | 2 | 3 | 4;
  dates: DateRange;
  party: GuestParty;
  promoCode: string;
  selected: SelectedRate | null;
  requests: string[];
  customRequest: string;
  guest: GuestInfo;
  messenger: MessengerChoice;
  paymentMethod: "card" | "invoice" | null;
  idConsent: boolean;
  termsConsent: boolean;
};

export const initialBooking: BookingState = {
  step: 1,
  dates: {},
  party: { adults: 2, children: 0 },
  promoCode: "",
  selected: null,
  requests: [],
  customRequest: "",
  guest: {
    salutation: null,
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    city: "",
    country: "",
  },
  messenger: { type: "none", username: "" },
  paymentMethod: null,
  idConsent: false,
  termsConsent: false,
};

export const BREAKFAST_PER_PERSON = 500;

// `value` is the canonical Russian string stored in the booking (so the admin
// always reads requests in Russian); `key` selects the localized display label.
export const SPECIAL_REQUEST_OPTIONS: { value: string; key: string }[] = [
  { value: "Ранний заезд (с 10:00)", key: "earlyCheckin" },
  { value: "Поздний выезд (до 16:00)", key: "lateCheckout" },
  { value: "Дополнительная кровать", key: "extraBed" },
  { value: "Детская кроватка", key: "babyCot" },
  { value: "Трансфер из аэропорта", key: "transfer" },
  { value: "Тихий номер", key: "quiet" },
  { value: "Номер на высоком этаже", key: "highFloor" },
  { value: "Вид на залив", key: "bayView" },
  { value: "Дополнительные полотенца", key: "towels" },
  { value: "Праздничное украшение номера", key: "decoration" },
];

export function nightsBetween(from?: Date, to?: Date): number {
  if (!from || !to) return 0;
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function calcTotals(state: BookingState) {
  const nights = nightsBetween(state.dates.from, state.dates.to);
  const guests = state.party.adults + state.party.children;
  const roomTotal = state.selected ? state.selected.room.price_from_rub * nights : 0;
  const breakfastTotal =
    state.selected?.mealPlan === "breakfast"
      ? BREAKFAST_PER_PERSON * guests * nights
      : 0;
  return {
    nights,
    guests,
    roomTotal,
    breakfastTotal,
    total: roomTotal + breakfastTotal,
  };
}

export function fmtRub(n: number) {
  return "₽ " + new Intl.NumberFormat("ru-RU").format(n);
}
