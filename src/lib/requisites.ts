import { usePageContent } from "@/lib/site-content";
import type { PageSchema } from "@/lib/content-registry";

// Реквизиты организации — единый источник. Хранятся в site_content под ключом
// "page:requisites". Их читают: бланк юр-документов (LegalDoc), политика,
// оферта, подвал. Меняет только Шеф (страница /admin/requisites).

export const REQUISITES_DEFAULT = {
  ipName: "ИП Смирнов Роман Яковлевич",
  ogrnip: "",
  inn: "772400271482",
  legalAddress: "г. Петропавловск-Камчатский, ул. Пограничная, д. 30, кв. 36",
  hotelAddress: "ул. Абеля, 41, Петропавловск-Камчатский",
  phone: "+7 (914) 994-57-57",
  email: "poluostrovkam@mail.ru",
  bankName: 'ФИЛИАЛ "ХАБАРОВСКИЙ" АО "АЛЬФА-БАНК"',
  bik: "040813770",
  corrAccount: "30101810800000000770",
  account: "40802810620180000192",
};

export type Requisites = typeof REQUISITES_DEFAULT;
export type RequisiteKey = keyof Requisites;

// Резолвит реквизиты (значение из БД или дефолт) для публичных страниц.
export function useRequisites(): Requisites {
  const c = usePageContent("requisites");
  const out = { ...REQUISITES_DEFAULT };
  (Object.keys(REQUISITES_DEFAULT) as RequisiteKey[]).forEach((k) => {
    out[k] = c.text(k, REQUISITES_DEFAULT[k]);
  });
  return out;
}

// Схема для редактора в кабинете Шефа (переиспользует PageEditor).
export const REQUISITES_SCHEMA: PageSchema = {
  key: "requisites",
  label: "Реквизиты",
  href: "/privacy",
  blocks: [
    {
      id: "org",
      label: "Организация",
      toggleable: false,
      fields: [
        { id: "ipName", label: "Наименование (ИП / юр. лицо)", type: "text", def: REQUISITES_DEFAULT.ipName },
        { id: "inn", label: "ИНН", type: "text", def: REQUISITES_DEFAULT.inn },
        { id: "ogrnip", label: "ОГРНИП / ОГРН (если есть)", type: "text", def: REQUISITES_DEFAULT.ogrnip },
        { id: "legalAddress", label: "Юридический адрес", type: "textarea", def: REQUISITES_DEFAULT.legalAddress },
        { id: "hotelAddress", label: "Адрес гостиницы", type: "text", def: REQUISITES_DEFAULT.hotelAddress },
        { id: "phone", label: "Телефон", type: "text", def: REQUISITES_DEFAULT.phone },
        { id: "email", label: "Email", type: "text", def: REQUISITES_DEFAULT.email },
      ],
    },
    {
      id: "bank",
      label: "Банковский счёт (для оферты/счетов)",
      toggleable: false,
      fields: [
        { id: "bankName", label: "Банк", type: "text", def: REQUISITES_DEFAULT.bankName },
        { id: "bik", label: "БИК", type: "text", def: REQUISITES_DEFAULT.bik },
        { id: "corrAccount", label: "Корр. счёт", type: "text", def: REQUISITES_DEFAULT.corrAccount },
        { id: "account", label: "Расчётный счёт", type: "text", def: REQUISITES_DEFAULT.account },
      ],
    },
  ],
};
