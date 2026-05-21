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
    photos: [
      "/rooms/comfort-3-shower/01.jpg",
      "/rooms/comfort-3-shower/02.jpg",
      "/rooms/comfort-3-shower/03.jpg",
      "/rooms/comfort-3-shower/04.jpg",
      "/rooms/comfort-3-shower/05.jpg",
      "/rooms/comfort-3-shower/06.jpg",
      "/rooms/comfort-3-shower/07.jpg",
      "/rooms/comfort-3-shower/08.jpg",
      "/rooms/comfort-3-shower/09.jpg",
      "/rooms/comfort-3-shower/10.jpg",
    ],
  },
  {
    id: "dvuhmestnyy-standart",
    name_ru: "Двухместный номер с 1 двуспальной или 2 односпальными кроватями",
    max_guests: 2,
    max_adults: 2,
    area_sqm: 17,
    rooms_count: 1,
    beds: "Одна двуспальная кровать или две односпальные (на выбор)",
    price_from_rub: 3300,
    quick_amenities: [
      { icon: "📶", label: "Wi-Fi" },
      { icon: "🔒", label: "Сейф" },
      { icon: "💨", label: "Фен" },
      { icon: "🚿", label: "Душ" },
      { icon: "🌡️", label: "Тёплый пол" },
      { icon: "📺", label: "Телевизор" },
    ],
    description_ru:
      "Номер рассчитан на одну двуспальную или две односпальные кровати. Вместимость до двух человек. Номер оснащён телевизором, холодильником, чайником, сейфом, санузлом с душем, феном и тёплыми полами. Для каждого гостя предусмотрены туалетные принадлежности, полотенца, халаты и одноразовые тапочки. Вид во двор.",
    amenities_categories: [
      {
        label: "🚿 Ванная комната",
        items: [
          "Душ",
          "Тёплый пол",
          "Раковина",
          "Унитаз",
          "Банные полотенца",
          "Гигиенические средства",
          "Тапочки",
          "Халаты",
        ],
      },
      {
        label: "📺 Электроника",
        items: [
          "Телевизор",
          "Фен",
          "Мини-холодильник",
          "Электронные замки",
          "Кулер на этаже",
        ],
      },
      {
        label: "🛋️ Мебель",
        items: [
          "Шкаф",
          "Стул",
          "Зеркало",
          "Багажная тумба",
          "Стол",
          "Тумба",
          "Вешалки",
        ],
      },
      {
        label: "🍵 Прочее",
        items: [
          "Сейф",
          "Чайный набор",
          "Чайник",
          "Стаканы",
          "Инфокарта/меню",
          "Обслуживание номеров",
          "Ковровое покрытие",
          "Высокие потолки",
        ],
      },
      {
        label: "🚫 Ограничения",
        items: ["Без питомцев", "Номер для некурящих"],
      },
    ],
    photos: [
      "/rooms/dvuhmestnyy-standart/01.jpg",
      "/rooms/dvuhmestnyy-standart/02.jpg",
      "/rooms/dvuhmestnyy-standart/03.jpg",
      "/rooms/dvuhmestnyy-standart/04.jpg",
      "/rooms/dvuhmestnyy-standart/05.jpg",
      "/rooms/dvuhmestnyy-standart/06.jpg",
    ],
  },
];
