import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Phone, Mail, MapPin, MessageCircle, Car, Plane, Bus, ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";
import { usePageContent } from "@/lib/site-content";
import { CONTACTS_DIRECTIONS_DEF } from "@/lib/content-registry";

export const Route = createFileRoute("/contacts")({
  component: ContactsPage,
  head: () => ({
    meta: [
      { title: "Контакты — Отель «Полуостров»" },
      { name: "description", content: "Контактная информация отеля «Полуостров» на Камчатке." },
    ],
  }),
});

const ICONS: Record<string, LucideIcon> = { map: MapPin, car: Car, plane: Plane, bus: Bus, phone: Phone };
const digits = (s: string) => s.replace(/[^\d+]/g, "");

function ContactsPage() {
  const { t } = useTranslation();
  const c = usePageContent("contacts");

  const address = c.text("info.address", "ул. Абеля, 41, Петропавловск-Камчатский");
  const phone = c.text("info.phone", "+7 (914) 994-57-57");
  const whatsapp = c.text("info.whatsapp", "+7 914 994-57-57");
  const email = c.text("info.email", "poluostrovkam@mail.ru");

  const cards = [
    { Icon: MapPin, label: "Адрес", value: address },
    { Icon: Phone, label: "Телефон", value: phone, href: `tel:${digits(phone)}` },
    { Icon: MessageCircle, label: "WhatsApp", value: whatsapp, href: `https://wa.me/${digits(whatsapp).replace(/^\+/, "")}`, external: true },
    { Icon: Mail, label: "Email", value: email, href: `mailto:${email}` },
  ];

  const directions = c.list("directions.items", CONTACTS_DIRECTIONS_DEF);

  return (
    <SiteLayout>
      <PageHero eyebrow="Contact" title={t("nav.contacts")} videoSrc="/media/contacts.mp4" />
      <section className="bg-background py-20">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-8">
          {cards.map(({ Icon, label, value, href, external }) => (
            <div key={label} className="border border-border bg-cream/40 p-8 text-center">
              <Icon className="mx-auto h-6 w-6 text-gold-ink" />
              <p className="mt-5 text-[10px] tracking-widest-plus uppercase text-muted-foreground">{label}</p>
              {href ? (
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="mt-2 block font-serif text-lg text-navy hover:text-gold-ink"
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

      {!c.hidden("directions") && (
        <section className="bg-[#f9f7f4] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 text-center">
              <h2 className="font-serif text-4xl text-navy">{c.text("directions.title", "Как до нас добраться")}</h2>
              <div className="mx-auto mt-5 h-px w-16 bg-gold" />
            </div>

            <div className="grid gap-10 lg:grid-cols-5">
              <div className="space-y-8 lg:col-span-2">
                {directions.map((d, i) => {
                  const Icon = ICONS[d.icon] ?? MapPin;
                  return (
                    <div key={i} className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-gold/40 text-gold-ink">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg text-navy">{d.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
                      </div>
                    </div>
                  );
                })}
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
      )}
    </SiteLayout>
  );
}
