// Локальный FAQ-перехватчик для консьержа «Аврора».
// Цель — НЕ тратить токены Gemini на типовые вопросы: если сообщение гостя
// совпадает с частым вопросом, сразу отдаём готовый ответ из нужного блока
// (трансфер, гастрономия и т.д.) на языке гостя. Не совпало → уходит в Gemini.

type Lang = "ru" | "en" | "zh";

type FaqEntry = {
  id: string;
  keywords: string[]; // нижний регистр; совпадение по подстроке (рус/англ/кит)
  answer: Record<Lang, string>;
};

// Язык по символам: кириллица → ru, иероглифы → zh, иначе → en.
export function detectLang(text: string): Lang {
  if (/[一-鿿]/.test(text)) return "zh";
  if (/[а-яё]/i.test(text)) return "ru";
  return "en";
}

// Нормализует код языка сайта (напр. "en-US" → "en") к поддерживаемому, иначе null.
export function normalizeLang(code?: string | null): Lang | null {
  if (!code) return null;
  const c = code.slice(0, 2).toLowerCase();
  return c === "ru" || c === "en" || c === "zh" ? c : null;
}

// Порядок важен: более специфичные записи идут раньше (первое совпадение выигрывает).
const FAQ: FaqEntry[] = [
  {
    id: "transfer",
    keywords: [
      "трансфер", "аэропорт", "из аэропорта", "забрать", "встрет", "довез", "доставить в отель",
      "airport", "transfer", "shuttle", "pick up", "pick-up", "pickup",
      "机场", "接机", "接送",
    ],
    answer: {
      ru: "Да, организуем трансфер из аэропорта Елизово (PKC) до отеля и обратно. Легковой автомобиль (до 3 гостей) — 1 500 ₽ за поездку, микроавтобус для группы — 2 000 ₽. Закажите заранее при бронировании или по телефону +7 (914) 994-57-57.",
      en: "Yes, we arrange airport transfers (Yelizovo / PKC ↔ hotel). A car (up to 3 guests) is 1,500 ₽ per trip, a minibus for groups 2,000 ₽. Please book it in advance with your reservation or by phone +7 (914) 994-57-57.",
      zh: "可以，我们提供机场接送（埃利佐沃机场 PKC ↔ 酒店）。轿车（最多3人）每趟1,500卢布，团体面包车2,000卢布。请在预订时或致电 +7 (914) 994-57-57 提前预约。",
    },
  },
  {
    id: "meals",
    keywords: [
      "питание", "покорм", "кормит", "завтрак", "обед", "ужин", "полупансион", "пансион", "еда", "ресторан",
      "meal", "food", "breakfast", "lunch", "dinner", "half board", "half-board", "full board",
      "餐", "早餐", "午餐", "晚餐",
    ],
    answer: {
      ru: "Да, в ресторане отеля есть питание по предзаказу: завтрак 450 ₽, обед 850 ₽, ужин 850 ₽ с гостя в сутки. Пакеты: полупансион (завтрак + ужин) 1 200 ₽, полный пансион 1 900 ₽. По умолчанию питание в стоимость номера не входит — его можно добавить отдельно при бронировании.",
      en: "Yes, our restaurant offers meals by pre-order: breakfast 450 ₽, lunch 850 ₽, dinner 850 ₽ per guest per day. Packages: half-board (breakfast + dinner) 1,200 ₽, full board 1,900 ₽. Meals are not included in the room rate by default — you can add them when booking.",
      zh: "有的，酒店餐厅提供预订餐食：早餐450卢布、午餐850卢布、晚餐850卢布（每位每天）。套餐：半膳（早+晚）1,200卢布，全膳1,900卢布。房费默认不含餐，预订时可另行添加。",
    },
  },
  {
    id: "checkin",
    keywords: [
      "заезд", "выезд", "заселен", "расчётный час", "расчетный час", "во сколько",
      "check in", "check-in", "checkin", "check out", "check-out", "checkout", "what time",
      "入住", "退房", "几点",
    ],
    answer: {
      ru: "Заезд с 14:00, выезд до 12:00. Ранний заезд или поздний выезд возможны при наличии свободных номеров — доплата 50 % стоимости ночи. Уточните при бронировании или по телефону +7 (914) 994-57-57.",
      en: "Check-in is from 14:00, check-out by 12:00. Early check-in / late check-out are possible subject to availability for +50% of the nightly rate. Please confirm with your booking or by phone +7 (914) 994-57-57.",
      zh: "入住时间14:00起，退房时间12:00前。如有空房可办理提前入住/延迟退房，需加收房费的50%。请在预订时或致电 +7 (914) 994-57-57 确认。",
    },
  },
  {
    id: "prepayment",
    keywords: ["предоплат", "задаток", "депозит", "prepay", "prepayment", "deposit", "预付"],
    answer: {
      ru: "Для подтверждения брони нужна предоплата — 30 % от суммы или стоимость одной ночи (что больше). Остальное оплачивается при заселении.",
      en: "To confirm a booking we require a prepayment of 30% or one night's cost (whichever is greater). The balance is paid at check-in.",
      zh: "确认预订需预付30%或一晚房费（取较高者），余款入住时支付。",
    },
  },
  {
    id: "payment",
    keywords: [
      "оплат", "оплатить", "картой", "сбп", "sberpay", "как платить", "способы оплаты",
      "pay", "payment", "card", "付款", "支付",
    ],
    answer: {
      ru: "Оплатить можно банковской картой или через СБП — безопасно, через Альфа-Банк. При бронировании вносится предоплата 30 % или стоимость одной ночи (что больше).",
      en: "You can pay by bank card or SBP — securely via Alfa-Bank. A prepayment of 30% or one night's cost (whichever is greater) is taken at booking.",
      zh: "可使用银行卡或SBP快捷支付付款（经Alfa银行安全处理）。预订时需预付30%或一晚房费（取较高者）。",
    },
  },
  {
    id: "booking",
    keywords: ["забронир", "бронир", "бронь", "book", "reserve", "reservation", "预订", "预定"],
    answer: {
      ru: "Забронировать можно онлайн на сайте в разделе «Забронировать» или по телефону +7 (914) 994-57-57. Там же видны актуальные цены и свободные номера на ваши даты.",
      en: "You can book online via the “Book” section of our website or by phone +7 (914) 994-57-57, where you'll also see live prices and availability for your dates.",
      zh: "可通过网站“预订”栏目在线预订，或致电 +7 (914) 994-57-57。在线预订还可查看您所选日期的实时价格和空房情况。",
    },
  },
  {
    id: "parking",
    keywords: ["парков", "оставить машин", "parking", "car park", "停车"],
    answer: {
      ru: "Да, на территории отеля есть бесплатная парковка.",
      en: "Yes, we have free parking on site.",
      zh: "有的，酒店提供免费停车位。",
    },
  },
  {
    id: "pets",
    keywords: ["животн", "питом", "собак", "кошк", "pet", "dog", "cat", "宠物"],
    answer: {
      ru: "К сожалению, размещение с животными у нас не предусмотрено.",
      en: "Unfortunately, we are unable to accommodate pets.",
      zh: "很抱歉，本酒店不接待携带宠物入住。",
    },
  },
  {
    id: "wifi",
    keywords: ["wi-fi", "wifi", "вай-фай", "вайфай", "интернет", "internet", "网络", "无线"],
    answer: {
      ru: "Да, бесплатный Wi-Fi есть во всех номерах.",
      en: "Yes, free Wi-Fi is available in all rooms.",
      zh: "有的，所有客房均提供免费Wi-Fi。",
    },
  },
  {
    id: "excursions",
    keywords: [
      "экскурс", "вулкан", "кит", "медвед", "термальн", "источник", "гейзер", "что посмотреть",
      "excursion", "tour", "volcano", "whale", "bear", "hot spring", "geyser",
      "火山", "观鲸", "温泉", "旅游",
    ],
    answer: {
      ru: "Да, помогаем с экскурсиями по Камчатке: вулканы, выход в океан и наблюдение за китами, термальные источники. Наш консьерж всё подскажет и организует — спросите на ресепшн или по телефону +7 (914) 994-57-57.",
      en: "Yes, we help arrange Kamchatka excursions: volcanoes, ocean trips and whale watching, thermal springs. Our concierge will advise and organise everything — just ask at reception or call +7 (914) 994-57-57.",
      zh: "可以，我们协助安排堪察加的行程：火山、出海观鲸、温泉等。礼宾部可为您建议并安排——请联系前台或致电 +7 (914) 994-57-57。",
    },
  },
  {
    id: "address",
    keywords: [
      "адрес", "как добраться", "как доехать", "где находится отель", "где вы находитесь",
      "address", "how to get", "where are you located", "location",
      "地址", "怎么去", "在哪",
    ],
    answer: {
      ru: "Мы находимся по адресу: ул. Абеля, 41, Петропавловск-Камчатский. От аэропорта Елизово (PKC) — около 30 минут на такси. Есть бесплатная парковка и трансфер от отеля по предзаказу.",
      en: "We are located at 41 Abelya St., Petropavlovsk-Kamchatsky. It's about 30 minutes by taxi from Yelizovo airport (PKC). Free parking and a pre-arranged hotel transfer are available.",
      zh: "我们的地址是：彼得罗巴甫洛夫斯克-堪察加，阿别利亚街41号。距埃利佐沃机场(PKC)约30分钟车程。提供免费停车及预约接送。",
    },
  },
];

/**
 * Подбирает готовый ответ на типовой вопрос. Возвращает строку или null.
 * Язык ответа: язык сайта гостя (langHint), иначе — по тексту сообщения.
 * Длинные/сложные сообщения (> 200 симв.) пропускаем — пусть отвечает Gemini.
 */
export function matchFaq(text: string, langHint?: string | null): string | null {
  const t = text.trim().toLowerCase();
  if (!t || t.length > 200) return null;
  const lang = normalizeLang(langHint) ?? detectLang(text);
  for (const entry of FAQ) {
    if (entry.keywords.some((k) => t.includes(k))) {
      return entry.answer[lang] ?? entry.answer.en;
    }
  }
  return null;
}
