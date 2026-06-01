// Single source of truth for booking channels / sources.
//
// `bookings.source` stores a slug. For website bookings it's "website";
// TravelLine bookings get a specific channel resolved from the TL booking's
// `source` object ({ type, code }). The dashboard / guests / calendar / analytics
// all display channels via `sourceLabel()`.

// TravelLine "Channel" codes → our slug. Confirmed by matching per-channel
// booking counts to TravelLine's «Менеджер каналов» (30-day column).
// Add new codes here as they appear (one line each).
const TL_CODE_TO_SLUG: Record<string, string> = {
  OTK: "ostrovok", // Ostrovok.ru (Emerging Travel Group)
  ANA: "roomlink", // Roomlink (Zabroniryi.ru)
  BR2: "bronevik", // Bronevik.com
  YAX: "yandex",
  YANDEX: "yandex",
  H1C: "hotels101", // 101hotels.com
  TIO: "trivio",
  CMB: "comfort_booking", // Агрегатор Comfort Booking
  SUT: "sutochno", // Суточно.ру
  ALN: "alean", // Алеан
  OZ2: "ozon", // Ozon Travel
  SSN: "susanin", // Туристическая фирма «Сусанин»
  PGS: "pegas", // PEGAS Touristik
  ACS: "acase", // Acase.ru (Академ-Онлайн)
  RTT: "rostelecom", // Rostelecom Travel Tech
  OTT: "onetwotrip", // OneTwoTrip
  OL2: "otello", // Otello
  OLO: "otello",
};

/** Resolve a TravelLine booking `source` object to our channel slug. */
export function resolveTlChannel(src: { type?: string; code?: string } | null | undefined): string {
  const type = src?.type;
  const code = (src?.code ?? "").toUpperCase();
  if (type === "PMS") return "tl_desk"; // entered at the front desk in TL
  if (type === "BookingEngine") return "tl_direct"; // direct via the TL booking widget
  if (type === "Channel") return TL_CODE_TO_SLUG[code] ?? `tl_${code.toLowerCase()}`;
  return "travelline";
}

// Slug → human label (RU). Unknown tl_* codes fall back to "TravelLine · CODE".
const SOURCE_LABEL: Record<string, string> = {
  website: "Сайт (наш)",
  site: "Сайт (наш)",
  manual: "Вручную",
  offline: "Вручную",
  travelline: "TravelLine (прочее)",
  tl_desk: "Стойка / вручную (TL)",
  tl_direct: "Прямой сайт (TL)",
  yandex: "Яндекс Путешествия",
  ostrovok: "Островок",
  roomlink: "Roomlink",
  bronevik: "Bronevik",
  hotels101: "101hotels.com",
  trivio: "Trivio",
  comfort_booking: "Comfort Booking",
  sutochno: "Суточно.ру",
  alean: "Алеан",
  ozon: "Ozon Travel",
  susanin: "ТФ «Сусанин»",
  pegas: "PEGAS Touristik",
  acase: "Acase (Академ)",
  rostelecom: "Rostelecom Travel",
  onetwotrip: "OneTwoTrip",
  otello: "Otello",
  booking: "Booking.com",
  avito: "Авито",
  expedia: "Expedia",
};

export function sourceLabel(slug: string | null | undefined): string {
  const s = slug ?? "";
  if (SOURCE_LABEL[s]) return SOURCE_LABEL[s];
  if (s.startsWith("tl_")) return `TravelLine · ${s.slice(3).toUpperCase()}`;
  return s || "—";
}

// Stable color per channel for charts/legends.
const SOURCE_COLOR: Record<string, string> = {
  website: "#1a1a2e",
  yandex: "#ef4444",
  ostrovok: "#3b82f6",
  sutochno: "#10b981",
  booking: "#0ea5e9",
  avito: "#22c55e",
  tl_direct: "#C9A96E",
  tl_desk: "#a78bfa",
  manual: "#a78bfa",
  travelline: "#9ca3af",
};
const PALETTE = ["#1a1a2e", "#C9A96E", "#3b82f6", "#10b981", "#ef4444", "#0ea5e9", "#a78bfa", "#f59e0b", "#22c55e"];

export function sourceColor(slug: string, i = 0): string {
  return SOURCE_COLOR[slug] ?? PALETTE[i % PALETTE.length];
}

export function sourceIcon(slug: string): string {
  if (slug === "website" || slug === "site" || slug === "tl_direct") return "🌐";
  if (slug === "manual" || slug === "offline" || slug === "tl_desk") return "✏️";
  return "🔄"; // any OTA / channel
}
