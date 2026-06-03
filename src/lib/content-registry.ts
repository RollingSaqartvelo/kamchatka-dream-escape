// Реестр редактируемого контента по страницам. Каждое поле имеет id, который
// СОВПАДАЕТ с id-геттером в JSX страницы. Реестр управляет формой редактора в
// админке (какие поля показывать) и хранит значения по умолчанию.
//
// Чтобы подключить новую страницу к конструктору: инструментируем её JSX
// геттерами usePageContent(...) и добавляем сюда её схему.

export type Field =
  | { id: string; label: string; type: "text" | "textarea"; def: string }
  | { id: string; label: string; type: "gallery"; def: string[] };

export type Block = {
  id: string; // id блока для скрытия (hidden)
  label: string;
  toggleable?: boolean; // можно ли скрыть весь блок
  fields: Field[];
};

export type PageSchema = {
  key: string; // page id (page:<key>)
  label: string;
  href: string; // публичный URL для предпросмотра
  blocks: Block[];
};

export const BREAKFAST_DEF = [
  "/media/breakfast-1.webp",
  "/media/breakfast-2.webp",
  "/media/breakfast-3.webp",
  "/media/breakfast-4.webp",
];
export const DINNER_DEF = ["/media/dinner-1.webp", "/media/dinner-2.webp", "/media/dinner-3.webp"];
export const DISHES_DEF = [
  "/media/dish-bruschetta.jpg",
  "/media/dish-vyalenoe-myaso.jpg",
  "/media/dish-tiramisu.jpg",
  "/media/dish-desert.jpg",
];

export const SERVICES_SCHEMA: PageSchema = {
  key: "services",
  label: "Услуги",
  href: "/services",
  blocks: [
    {
      id: "transfer",
      label: "Трансфер",
      toggleable: true,
      fields: [
        { id: "transfer.eyebrow", label: "Надзаголовок", type: "text", def: "Услуги" },
        { id: "transfer.title", label: "Заголовок", type: "text", def: "Трансфер" },
        {
          id: "transfer.desc",
          label: "Описание",
          type: "textarea",
          def: "Встретим в аэропорту Елизово (PKC) и доставим в отель — и обратно. Закажите трансфер заранее при бронировании.",
        },
        { id: "transfer.car.title", label: "Карточка 1 — название", type: "text", def: "Легковой автомобиль" },
        { id: "transfer.car.note", label: "Карточка 1 — подпись", type: "text", def: "Аэропорт Елизово ↔ отель, до 3 пассажиров" },
        { id: "transfer.car.price", label: "Карточка 1 — цена", type: "text", def: "1 500 ₽" },
        { id: "transfer.car.unit", label: "Карточка 1 — единица", type: "text", def: "/ поездка" },
        { id: "transfer.bus.title", label: "Карточка 2 — название", type: "text", def: "Микроавтобус" },
        { id: "transfer.bus.note", label: "Карточка 2 — подпись", type: "text", def: "Аэропорт Елизово ↔ отель, для группы" },
        { id: "transfer.bus.price", label: "Карточка 2 — цена", type: "text", def: "2 000 ₽" },
        { id: "transfer.bus.unit", label: "Карточка 2 — единица", type: "text", def: "/ поездка" },
      ],
    },
    {
      id: "earlylate",
      label: "Ранний заезд / поздний выезд",
      toggleable: true,
      fields: [
        { id: "earlylate.eyebrow", label: "Надзаголовок", type: "text", def: "Услуги" },
        { id: "earlylate.title", label: "Заголовок", type: "text", def: "Ранний заезд и поздний выезд" },
        {
          id: "earlylate.desc",
          label: "Описание",
          type: "textarea",
          def: "Расчётный час: заезд с 14:00, выезд до 12:00. Нужно раньше или позже — доплата 50 % стоимости за ночь. Уточните возможность при бронировании.",
        },
        { id: "earlylate.early.title", label: "Ранний заезд — название", type: "text", def: "Ранний заезд" },
        { id: "earlylate.early.note", label: "Ранний заезд — подпись", type: "text", def: "Заселение до 14:00" },
        { id: "earlylate.early.value", label: "Ранний заезд — значение", type: "text", def: "50 %" },
        { id: "earlylate.early.unit", label: "Ранний заезд — единица", type: "text", def: "от стоимости за ночь" },
        { id: "earlylate.late.title", label: "Поздний выезд — название", type: "text", def: "Поздний выезд" },
        { id: "earlylate.late.note", label: "Поздний выезд — подпись", type: "text", def: "Выезд после 12:00" },
        { id: "earlylate.late.value", label: "Поздний выезд — значение", type: "text", def: "50 %" },
        { id: "earlylate.late.unit", label: "Поздний выезд — единица", type: "text", def: "от стоимости за ночь" },
      ],
    },
    {
      id: "breakfast",
      label: "Завтрак",
      toggleable: true,
      fields: [
        { id: "breakfast.eyebrow", label: "Надзаголовок", type: "text", def: "Гастрономия" },
        { id: "breakfast.title", label: "Заголовок", type: "text", def: "Завтрак" },
        {
          id: "breakfast.desc",
          label: "Описание",
          type: "textarea",
          def: "Комплексный завтрак по предварительному заказу — приготовлен из локальных продуктов и подаётся в нашем ресторане.",
        },
        { id: "breakfast.price", label: "Цена", type: "text", def: "450 ₽" },
        { id: "breakfast.unit", label: "Единица", type: "text", def: "/ гость в сутки" },
        { id: "breakfast.note", label: "Примечание", type: "text", def: "Заказ принимается до 20:00 предыдущего дня" },
        { id: "breakfast.photos", label: "Фотографии", type: "gallery", def: BREAKFAST_DEF },
      ],
    },
    {
      id: "lunch",
      label: "Обед",
      toggleable: true,
      fields: [
        { id: "lunch.eyebrow", label: "Надзаголовок", type: "text", def: "Гастрономия" },
        { id: "lunch.title", label: "Заголовок", type: "text", def: "Обед" },
        {
          id: "lunch.desc",
          label: "Описание",
          type: "textarea",
          def: "Комплексный обед из локальных продуктов — по предварительному заказу.",
        },
        { id: "lunch.price", label: "Цена", type: "text", def: "850 ₽" },
        { id: "lunch.unit", label: "Единица", type: "text", def: "/ гость в сутки" },
        { id: "lunch.photos", label: "Фотографии блюд", type: "gallery", def: DISHES_DEF },
      ],
    },
    {
      id: "dinner",
      label: "Ужин",
      toggleable: true,
      fields: [
        { id: "dinner.eyebrow", label: "Надзаголовок", type: "text", def: "Гастрономия" },
        { id: "dinner.title", label: "Заголовок", type: "text", def: "Ужин" },
        {
          id: "dinner.desc",
          label: "Описание",
          type: "textarea",
          def: "Комплексный ужин по предварительному заказу — салат, горячее блюдо, гарнир и домашний напиток.",
        },
        { id: "dinner.price", label: "Цена", type: "text", def: "850 ₽" },
        { id: "dinner.unit", label: "Единица", type: "text", def: "/ гость в сутки" },
        { id: "dinner.note", label: "Примечание", type: "text", def: "Заказ принимается до 14:00 в день подачи" },
        { id: "dinner.photos", label: "Фотографии", type: "gallery", def: DINNER_DEF },
      ],
    },
    {
      id: "packages",
      label: "Пакеты питания",
      toggleable: true,
      fields: [
        { id: "packages.eyebrow", label: "Надзаголовок", type: "text", def: "Питание" },
        { id: "packages.title", label: "Заголовок", type: "text", def: "Пакеты питания" },
        {
          id: "packages.desc",
          label: "Описание",
          type: "textarea",
          def: "Закажите питание на весь срок проживания — выгоднее, чем по отдельности.",
        },
        { id: "packages.half.title", label: "Полупансион — название", type: "text", def: "Полупансион" },
        { id: "packages.half.note", label: "Полупансион — состав", type: "text", def: "Завтрак и ужин" },
        { id: "packages.half.price", label: "Полупансион — цена", type: "text", def: "1 200 ₽" },
        { id: "packages.half.unit", label: "Полупансион — единица", type: "text", def: "/ гость в сутки" },
        { id: "packages.full.title", label: "Полный пансион — название", type: "text", def: "Полный пансион" },
        { id: "packages.full.note", label: "Полный пансион — состав", type: "text", def: "Завтрак, обед и ужин" },
        { id: "packages.full.price", label: "Полный пансион — цена", type: "text", def: "1 900 ₽" },
        { id: "packages.full.unit", label: "Полный пансион — единица", type: "text", def: "/ гость в сутки" },
      ],
    },
  ],
};

export const HOME_ABOUT_DEF = ["/media/about-building.webp"];
export const HOME_WELLNESS_DEF = ["/media/wellness-home.webp"];

export const HOME_SCHEMA: PageSchema = {
  key: "home",
  label: "Главная",
  href: "/",
  blocks: [
    {
      id: "hero",
      label: "Шапка (hero) — фон остаётся видео",
      toggleable: false,
      fields: [
        { id: "hero.eyebrow", label: "Надзаголовок", type: "text", def: "Отель «Полуостров» · Камчатка" },
        { id: "hero.title", label: "Заголовок", type: "text", def: "Где океан встречается с вулканами" },
        { id: "hero.subtitle", label: "Подзаголовок", type: "textarea", def: "Бутик-отель на берегу Авачинской бухты — ваш дом на краю света." },
        { id: "hero.cta", label: "Кнопка 1", type: "text", def: "Забронировать номер" },
        { id: "hero.ctaSecondary", label: "Кнопка 2", type: "text", def: "Открыть номера" },
        { id: "hero.scroll", label: "Подсказка прокрутки", type: "text", def: "Прокрутите" },
      ],
    },
    {
      id: "about",
      label: "Об отеле (фото + текст)",
      toggleable: true,
      fields: [
        { id: "about.eyebrow", label: "Надзаголовок", type: "text", def: "О нас" },
        { id: "about.title", label: "Заголовок", type: "text", def: "Камчатка, как вы её ещё не видели" },
        { id: "about.text", label: "Текст", type: "textarea", def: "«Полуостров» — это место, где камчатская природа встречается с гостеприимством. Мы заботимся о каждой детали, чтобы ваш визит остался в памяти." },
        { id: "about.cta", label: "Кнопка", type: "text", def: "Подробнее" },
        { id: "about.photo", label: "Фото", type: "gallery", def: HOME_ABOUT_DEF },
      ],
    },
    {
      id: "rooms",
      label: "Номера",
      toggleable: true,
      fields: [
        { id: "rooms.eyebrow", label: "Надзаголовок", type: "text", def: "01 — Размещение" },
        { id: "rooms.title", label: "Заголовок", type: "text", def: "Номера и сьюты" },
        { id: "rooms.tagline", label: "Слоган", type: "text", def: "Виды на океан и вулканы из каждого окна" },
        { id: "rooms.body", label: "Текст", type: "textarea", def: "21 номер для тех, кто ценит настоящий отдых на краю земли. От уютных стандартных номеров до просторных семейных — каждый оснащён всем необходимым: удобными кроватями, телевизором, холодильником, феном, Wi-Fi и тёплыми полами." },
        { id: "rooms.stat1Title", label: "Показатель 1 — число", type: "text", def: "21 номер" },
        { id: "rooms.stat1Sub", label: "Показатель 1 — подпись", type: "text", def: "от 1 200 ₽/ночь" },
        { id: "rooms.stat2Title", label: "Показатель 2 — число", type: "text", def: "Вид на залив" },
        { id: "rooms.stat2Sub", label: "Показатель 2 — подпись", type: "text", def: "и вулканы" },
        { id: "rooms.stat3Title", label: "Показатель 3 — число", type: "text", def: "Все удобства" },
        { id: "rooms.stat3Sub", label: "Показатель 3 — подпись", type: "text", def: "включены" },
        { id: "rooms.cta", label: "Кнопка", type: "text", def: "Посмотреть номера" },
      ],
    },
    {
      id: "wellness",
      label: "Оздоровление (фото + текст)",
      toggleable: true,
      fields: [
        { id: "wellness.eyebrow", label: "Надзаголовок", type: "text", def: "02 — Wellness" },
        { id: "wellness.title", label: "Заголовок", type: "text", def: "Оздоровление" },
        { id: "wellness.subtitle", label: "Текст", type: "textarea", def: "Термальные источники, спа и тишина" },
        { id: "wellness.photo", label: "Фото", type: "gallery", def: HOME_WELLNESS_DEF },
      ],
    },
    {
      id: "homeservices",
      label: "Услуги (4 карточки)",
      toggleable: true,
      fields: [
        { id: "homeservices.eyebrow", label: "Надзаголовок", type: "text", def: "04 — Услуги" },
        { id: "homeservices.title", label: "Заголовок", type: "text", def: "Услуги отеля" },
        { id: "homeservices.subtitle", label: "Подзаголовок", type: "text", def: "Всё для безупречного отдыха" },
        { id: "homeservices.i1Title", label: "Карточка 1 — название", type: "text", def: "Трансфер" },
        { id: "homeservices.i1Text", label: "Карточка 1 — текст", type: "text", def: "Из аэропорта и по городу на премиальных авто." },
        { id: "homeservices.i2Title", label: "Карточка 2 — название", type: "text", def: "Экскурсии" },
        { id: "homeservices.i2Text", label: "Карточка 2 — текст", type: "text", def: "Вулканы, океан, термальные источники." },
        { id: "homeservices.i3Title", label: "Карточка 3 — название", type: "text", def: "Консьерж" },
        { id: "homeservices.i3Text", label: "Карточка 3 — текст", type: "text", def: "Бронирование, советы, особые запросы 24/7." },
        { id: "homeservices.i4Title", label: "Карточка 4 — название", type: "text", def: "Завтрак" },
        { id: "homeservices.i4Text", label: "Карточка 4 — текст", type: "text", def: "Камчатская кухня от шеф-повара ресторана." },
      ],
    },
  ],
};

export const ABOUT_INTRO_DEF = [
  "Новый уютный мини-отель «Полуостров» предлагает гостям и жителям города комфортное проживание со всеми удобствами и собственным рестораном.",
  "В отеле имеются 9 стандартных номеров, оснащённых согласно современному сервису: каждый оборудован санузлом с душем, телевизором с плоским экраном, холодильником, сейфом, чайником и банными принадлежностями, а также 4 комнаты многоместного проживания с общими кухонной и зоной отдыха, душевыми и туалетными помещениями.",
  "Гости могут выбрать тип размещения согласно своим предпочтениям: как отдельные номера с двуспальной или двумя односпальными кроватями, так и места в хостеле.",
  "На всей территории гостиницы и в номерах имеется бесплатный доступ в интернет Wi-Fi. Также к услугам гостей бесплатная парковка, камера хранения, гладильная доска и утюг.",
  "Мы всегда рады приветствовать Вас и сделаем всё возможное, чтобы Ваше путешествие оставило самое яркое и приятное впечатление.",
].join("\n\n");

export const ABOUT_HOWTO_DEF = [
  "Перейдите на сайт и откройте форму бронирования",
  "Укажите даты заезда и выезда",
  "Выберите количество номеров и число проживающих",
  "Укажите предпочтения по размещению",
  "Подтвердите бронирование",
].join("\n");

export const ABOUT_BULLETS_DEF = [
  "Чистые номера с удобными кроватями",
  "Отдельные санузлы в каждом номере",
  "Тишина и уютная атмосфера",
  "Выбор формата — от койко-места до двухместного номера",
].join("\n");

export const ABOUT_SCHEMA: PageSchema = {
  key: "about",
  label: "Об отеле / Условия",
  href: "/about",
  blocks: [
    {
      id: "intro",
      label: "Об отеле (текст)",
      toggleable: true,
      fields: [
        { id: "intro.eyebrow", label: "Надзаголовок", type: "text", def: "Полуостров" },
        { id: "intro.title", label: "Заголовок", type: "text", def: "Уютный мини-отель в сердце Камчатки" },
        { id: "intro.body", label: "Текст (абзацы — через пустую строку)", type: "textarea", def: ABOUT_INTRO_DEF },
      ],
    },
    {
      id: "conditions",
      label: "Условия проживания (таблица номеров — фиксирована)",
      toggleable: true,
      fields: [
        { id: "conditions.eyebrow", label: "Надзаголовок", type: "text", def: "Условия проживания" },
        { id: "conditions.title", label: "Заголовок", type: "text", def: "Мини-отель «Полуостров»" },
        { id: "conditions.roomFundTitle", label: "Заголовок таблицы", type: "text", def: "Номерной фонд" },
        { id: "conditions.checkinTitle", label: "Заезд/выезд — заголовок", type: "text", def: "Время заезда и выезда" },
        { id: "conditions.checkin", label: "Заезд/выезд — строки (по одной в строке)", type: "textarea", def: "Заезд — с 14:00\nВыезд — до 12:00" },
        { id: "conditions.checkinNote", label: "Заезд/выезд — примечание", type: "textarea", def: "Ранний заезд и поздний выезд — по запросу и при наличии свободных номеров." },
        { id: "conditions.cancelTitle", label: "Отмена — заголовок", type: "text", def: "Отмена бронирования" },
        { id: "conditions.cancel", label: "Отмена — строки (по одной в строке)", type: "textarea", def: "Бесплатная отмена — за 14 дней и более до даты заезда\nПри отмене менее чем за 14 дней — применяются штрафные санкции" },
        { id: "conditions.howtoTitle", label: "Как забронировать — заголовок", type: "text", def: "Как забронировать" },
        { id: "conditions.howto", label: "Шаги бронирования (по одному в строке)", type: "textarea", def: ABOUT_HOWTO_DEF },
        { id: "conditions.footer", label: "Подпись внизу", type: "text", def: "Ждём вас в мини-отеле «Полуостров»" },
      ],
    },
    {
      id: "cta",
      label: "Призыв «Тихая гавань»",
      toggleable: true,
      fields: [
        { id: "cta.eyebrow", label: "Надзаголовок", type: "text", def: "Тихая гавань" },
        { id: "cta.title", label: "Заголовок", type: "text", def: "Ищете спокойное место для отдыха на Камчатке?" },
        { id: "cta.lead", label: "Вводный текст", type: "textarea", def: "«Полуостров» — небольшой отель, где всё создано для тихого и комфортного проживания." },
        { id: "cta.bullets", label: "Преимущества (по одному в строке)", type: "textarea", def: ABOUT_BULLETS_DEF },
        { id: "cta.body", label: "Текст под списком", type: "textarea", def: "Многие гости приезжают к нам после поездок по Камчатке — чтобы отдохнуть пару дней, восстановиться и набраться сил перед дорогой домой." },
        { id: "cta.ctaEyebrow", label: "Призыв — надзаголовок", type: "text", def: "Готовы приехать?" },
        { id: "cta.ctaBody", label: "Призыв — текст", type: "textarea", def: "Забронируйте номер прямо на сайте — выберите даты, формат размещения и подтвердите бронирование за пару минут." },
        { id: "cta.button", label: "Кнопка", type: "text", def: "Забронировать на сайте" },
        { id: "cta.closing", label: "Финальная строка", type: "text", def: "Полуостров — место, куда хочется возвращаться" },
      ],
    },
  ],
};

export const PAGE_SCHEMAS: Record<string, PageSchema> = {
  services: SERVICES_SCHEMA,
  home: HOME_SCHEMA,
  about: ABOUT_SCHEMA,
};
