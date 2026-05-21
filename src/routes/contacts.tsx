import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Phone, Mail, MapPin } from "lucide-react";
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
        <div className="mx-auto grid max-w-4xl gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            { Icon: MapPin, label: "Адрес", value: t("header.address") },
            { Icon: Phone, label: "Телефон", value: t("header.phone"), href: "tel:+79149945757" },
            { Icon: Mail, label: "Email", value: "poluostrovkam@mail.ru", href: "mailto:poluostrovkam@mail.ru" },
          ].map(({ Icon, label, value, href }) => (
            <div key={label} className="border border-border bg-cream/40 p-8 text-center">
              <Icon className="mx-auto h-6 w-6 text-gold" />
              <p className="mt-5 text-[10px] tracking-widest-plus uppercase text-muted-foreground">
                {label}
              </p>
              {href ? (
                <a href={href} className="mt-2 block font-serif text-lg text-navy hover:text-gold">
                  {value}
                </a>
              ) : (
                <p className="mt-2 font-serif text-lg text-navy">{value}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
