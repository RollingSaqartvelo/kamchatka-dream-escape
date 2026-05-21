export type AmenityCategory = {
  label: string;
  items: string[];
};

export type Room = {
  id: string;
  name_ru: string;
  max_guests: number;
  max_adults: number;
  area_sqm: number;
  rooms_count: number;
  levels?: number;
  beds: string;
  price_from_rub: number;
  quick_amenities: { icon: string; label: string }[];
  description_ru: string;
  amenities_categories: AmenityCategory[];
  photos: string[]; // urls, may be empty
};

export const ROOMS: Room[] = [
  {
    id: "comfort-3-shower",
    name_ru: "Трёхместный номер «Комфорт» с душем",
    max_guests: 4,
    max_adults: 3,
    area_sqm: 20,
    rooms_count: 1,
    levels: 2,
    beds: "Двуспальная кровать-трансформер + полуторная кровать (2 уровень) + односпальная софа",
    price_from_rub: 4400,
    quick_amenities: [
      { icon: "📶", label: "Wi-Fi" },
      { icon: "🔒", label: "Сейф" },
      { icon: "💨", label: "Фен" },
      { icon: "🚿", label: "Душ" },
      { icon: "📺", label: "Телевизор" },
    ],
    description_ru:
      "Двухуровневый номер повышенной комфортности. Рассчитан на 3 основных и 1 дополнительное место. Основные места: двуспальная кровать-трансформер и полутороспальная кровать на втором уровне. Дополнительное место: односпальная софа. В номере: телевизор, холодильник, чайник, сейф, санузел с душем, фен. Каждому гостю: туалетные принадлежности, полотенца, халаты и одноразовые тапочки.",
    amenities_categories: [
      { label: "🐾 Размещение с питомцами", items: ["Без питомцев"] },
      { label: "🚿 Ванная комната", items: ["Душ", "Раковина", "Унитаз", "Туалетные средства"] },
      {
        label: "🛋️ Мебель",
        items: ["Багажная тумба", "Стул", "Шкаф для одежды", "Стол", "Журнальный столик"],
      },
      { label: "📺 Видео/аудио", items: ["Телевизор с плоским экраном"] },
      { label: "🌐 Интернет", items: ["Wi-Fi бесплатный"] },
      { label: "🍳 Кухонная зона", items: ["Холодильник", "Чайник"] },
    ],
    photos: [],
  },
];
