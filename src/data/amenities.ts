// Каталог удобств для карточек добавленных номеров (UI-кнопки в редакторе +
// отображение на публичной странице). key хранится в custom_rooms.amenities[].

export type AmenityOption = { key: string; label: string; icon: string };

export const AMENITY_OPTIONS: AmenityOption[] = [
  { key: "wifi", label: "Wi-Fi", icon: "📶" },
  { key: "tv", label: "Телевизор", icon: "📺" },
  { key: "fridge", label: "Холодильник", icon: "❄️" },
  { key: "kettle", label: "Чайник", icon: "🫖" },
  { key: "safe", label: "Сейф", icon: "🔒" },
  { key: "ac", label: "Кондиционер", icon: "🌬️" },
  { key: "shower", label: "Душ", icon: "🚿" },
  { key: "bath", label: "Ванна", icon: "🛁" },
  { key: "sink", label: "Раковина", icon: "🚰" },
  { key: "hairdryer", label: "Фен", icon: "💨" },
  { key: "warmfloor", label: "Тёплый пол", icon: "🌡️" },
  { key: "balcony", label: "Балкон", icon: "🪟" },
  { key: "view", label: "Вид на залив", icon: "🌊" },
  { key: "robes", label: "Халаты", icon: "🧖" },
  { key: "slippers", label: "Тапочки", icon: "🥿" },
  { key: "toiletries", label: "Туалетные принадлежности", icon: "🧴" },
  { key: "kitchen", label: "Мини-кухня", icon: "🍳" },
  { key: "microwave", label: "Микроволновка", icon: "🔥" },
  { key: "dishes", label: "Посуда", icon: "🍽️" },
  { key: "iron", label: "Утюг", icon: "👔" },
  { key: "workspace", label: "Рабочий стол", icon: "💻" },
  { key: "parking", label: "Парковка", icon: "🅿️" },
];

export const AMENITY_BY_KEY: Record<string, AmenityOption> = Object.fromEntries(
  AMENITY_OPTIONS.map((a) => [a.key, a]),
);
