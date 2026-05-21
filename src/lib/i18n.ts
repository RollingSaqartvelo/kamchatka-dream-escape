import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  ru: {
    translation: {
      nav: {
        rooms: "Номера",
        services: "Услуги",
        wellness: "Оздоровление",
        restaurant: "Ресторан",
        about: "Об отеле",
        contacts: "Контакты",
        book: "Забронировать",
        account: "Личный кабинет",
      },
      header: {
        phone: "+7 (914) 994-57-57",
        address: "ул. Абеля, 41, Петропавловск-Камчатский",
      },
      hero: {
        eyebrow: "Отель «Полуостров» · Камчатка",
        title: "Где океан встречается с вулканами",
        subtitle: "Бутик-отель на берегу Авачинской бухты — ваш дом на краю света.",
        cta: "Забронировать номер",
        ctaSecondary: "Открыть номера",
      },
      sections: {
        roomsTitle: "Номера и сьюты",
        roomsSub: "Виды на океан и вулканы из каждого окна",
        wellnessTitle: "Оздоровление",
        wellnessSub: "Термальные ванны, спа и тишина",
        restaurantTitle: "Ресторан «Артишок»",
        restaurantSub: "Камчатская кухня от шеф-повара",
        servicesTitle: "Услуги отеля",
        servicesSub: "Всё для безупречного отдыха",
        aboutTitle: "О нас",
        aboutText:
          "«Полуостров» — это место, где камчатская природа встречается с гостеприимством. Мы заботимся о каждой детали, чтобы ваш визит остался в памяти.",
        discover: "Подробнее",
      },
      footer: {
        about: "Отель «Полуостров» — бутик-отель премиум-класса на Камчатке.",
        contact: "Контакты",
        nav: "Навигация",
        legal: "Правовая информация",
        privacy: "Политика конфиденциальности",
        terms: "Пользовательское соглашение",
        rights: "© 2026 Отель «Полуостров». Все права защищены.",
      },
      widget: {
        chat: "Чат с консьержем",
        call: "Позвонить",
      },
      pages: {
        soonTitle: "Скоро здесь",
        soonText: "Эта страница в работе. Возвращайтесь чуть позже.",
      },
    },
  },
  en: {
    translation: {
      nav: {
        rooms: "Rooms",
        services: "Services",
        wellness: "Wellness",
        restaurant: "Restaurant",
        about: "About",
        contacts: "Contact",
        book: "Book now",
        account: "My account",
      },
      header: {
        phone: "+7 (914) 994-57-57",
        address: "41 Abel St., Petropavlovsk-Kamchatsky",
      },
      hero: {
        eyebrow: "Poluostrov Hotel · Kamchatka",
        title: "Where the ocean meets the volcanoes",
        subtitle: "A boutique hotel on Avacha Bay — your home at the edge of the world.",
        cta: "Book your stay",
        ctaSecondary: "Explore rooms",
      },
      sections: {
        roomsTitle: "Rooms & suites",
        roomsSub: "Ocean and volcano views from every window",
        wellnessTitle: "Wellness",
        wellnessSub: "Thermal baths, spa and silence",
        restaurantTitle: "Artichoke Restaurant",
        restaurantSub: "Kamchatka cuisine by our chef",
        servicesTitle: "Hotel services",
        servicesSub: "Everything for a flawless stay",
        aboutTitle: "About us",
        aboutText:
          "Poluostrov is where Kamchatka's nature meets true hospitality. We care for every detail so your visit becomes a memory.",
        discover: "Discover",
      },
      footer: {
        about: "Poluostrov — a premium boutique hotel on Kamchatka peninsula.",
        contact: "Contact",
        nav: "Navigation",
        legal: "Legal",
        privacy: "Privacy policy",
        terms: "Terms of service",
        rights: "© 2026 Poluostrov Hotel. All rights reserved.",
      },
      widget: {
        chat: "Chat with concierge",
        call: "Call us",
      },
      pages: {
        soonTitle: "Coming soon",
        soonText: "This page is in progress. Please check back shortly.",
      },
    },
  },
  zh: {
    translation: {
      nav: {
        rooms: "客房",
        services: "服务",
        wellness: "养生",
        restaurant: "餐厅",
        about: "关于",
        contacts: "联系",
        book: "立即预订",
        account: "我的账户",
      },
      header: {
        phone: "+7 (914) 994-57-57",
        address: "阿贝尔街41号，彼得罗巴甫洛夫斯克",
      },
      hero: {
        eyebrow: "半岛酒店 · 堪察加",
        title: "海洋与火山相遇之处",
        subtitle: "阿瓦查湾畔的精品酒店 — 您在世界尽头的家。",
        cta: "立即预订",
        ctaSecondary: "查看客房",
      },
      sections: {
        roomsTitle: "客房与套房",
        roomsSub: "每扇窗都能看到海洋与火山",
        wellnessTitle: "养生中心",
        wellnessSub: "温泉、水疗与宁静",
        restaurantTitle: "朝鲜蓟餐厅",
        restaurantSub: "主厨的堪察加美食",
        servicesTitle: "酒店服务",
        servicesSub: "完美入住的一切",
        aboutTitle: "关于我们",
        aboutText: "半岛酒店将堪察加的自然与真挚的款待融为一体。",
        discover: "了解更多",
      },
      footer: {
        about: "半岛 — 堪察加半岛的高端精品酒店。",
        contact: "联系",
        nav: "导航",
        legal: "法律",
        privacy: "隐私政策",
        terms: "服务条款",
        rights: "© 2026 半岛酒店。版权所有。",
      },
      widget: {
        chat: "与礼宾对话",
        call: "致电我们",
      },
      pages: {
        soonTitle: "即将推出",
        soonText: "此页面正在建设中，请稍后再来。",
      },
    },
  },
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "ru",
      supportedLngs: ["ru", "en", "zh"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
      },
    });
}

export default i18n;
