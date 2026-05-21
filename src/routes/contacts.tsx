import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Phone, Mail, MapPin, MessageCircle, Car, Plane, Bus, ExternalLink } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";

export const Route = createFileRoute("/contacts")({
  component: ContactsPage,
  head: () => ({
    meta: [
      { title: "Контакты — Отель «Полуостров»" },
      { name: "description", content: "Контактная информация отеля «Полуостров» на Камчатке." },
    ],
  }),
});

function ContactsPage() {
  const { t } = useTranslation();
  return (
    <SiteLayout>
      <PageHero eyebrow="Contact" title={t("nav.contacts")} videoSrc="/media/contacts.mp4" />
      <section className="bg-background py-20">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-8">
          {[
            { Icon: MapPin, label: "Адрес", value: t("header.address") },
            { Icon: Phone, label: "Телефон", value: t("header.phone"), href: "tel:+79149945757" },
            { Icon: MessageCircle, label: "WhatsApp", value: "+7 914 994-57-57", href: "https://wa.me/79149945757", external: true },
            { Icon: Mail, label: "Email", value: "poluostrovkam@mail.ru", href: "mailto:poluostrovkam@mail.ru" },
          ].map(({ Icon, label, value, href, external }) => (
            <div key={label} className="border border-border bg-cream/40 p-8 text-center">
              <Icon className="mx-auto h-6 w-6 text-gold" />
              <p className="mt-5 text-[10px] tracking-widest-plus uppercase text-muted-foreground">
                {label}
              </p>
              {href ? (
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="mt-2 block font-serif text-lg text-navy hover:text-gold"
                >
                  {value}
                </a>
              ) : (
                <p className="mt-2 font-serif text-lg text-navy">{value}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f9f7f4] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="font-serif text-4xl text-navy">Как до нас добраться</h2>
            <div className="mx-auto mt-5 h-px w-16 bg-gold" />
          </div>

          <div className="grid gap-10 lg:grid-cols-5">
            <div className="space-y-8 lg:col-span-2">
              {[
                {
                  Icon: MapPin,
                  title: "Адрес",
                  body: <>г. Петропавловск-Камчатский,<br />ул. Абеля, 41</>,
                },
                {
                  Icon: Car,
                  title: "На автомобиле",
                  body: <>С центра города по ул. Ленинская в сторону набережной, повернуть на ул. Абеля. Бесплатная парковка на территории.</>,
                },
                {
                  Icon: Plane,
                  title: "Из аэропорта",
                  body: <>Аэропорт Петропавловск-Камчатский (PKC) — ~30 минут на такси. Рекомендуем Яндекс Такси или трансфер от отеля (закажите заранее при бронировании).</>,
                },
                {
                  Icon: Bus,
                  title: "На общественном транспорте",
                  body: <>Автобусные маршруты до остановки «Абеля».</>,
                },
                {
                  Icon: Phone,
                  title: "Нужен трансфер?",
                  body: (
                    <>
                      Позвоните нам:{" "}
                      <a href="tel:+79149945757" className="font-medium text-navy hover:text-gold">
                        +7 (914) 994-57-57
                      </a>
                      . Организуем трансфер из аэропорта.
                    </>
                  ),
                },
              ].map(({ Icon, title, body }) => (
                <div key={title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-gold/40 text-gold">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-navy">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-3">
              <div className="overflow-hidden rounded-lg shadow-lg">
                <iframe
                  title="Яндекс Карта — Гостиница Полуостров"
                  src="https://yandex.ru/map-widget/v1/?ll=158.603533%2C53.063398&z=16&pt=158.603533%2C53.063398,pm2rdm"
                  className="h-[300px] w-full border-0 md:h-[450px]"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <a
                href="https://yandex.ru/maps/?pt=158.603533,53.063398&z=16&l=map"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 border border-navy px-6 py-3 text-[11px] tracking-widest-plus uppercase text-navy transition-colors hover:bg-navy hover:text-cream"
                style={{ borderRadius: "2px" }}
              >
                Открыть в Яндекс Картах
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
