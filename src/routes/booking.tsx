import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";

export const Route = createFileRoute("/booking")({
  component: BookingPage,
  head: () => ({
    meta: [
      { title: "Бронирование — Отель «Полуостров»" },
      { name: "description", content: "Онлайн-бронирование номеров отеля «Полуостров» на Камчатке." },
    ],
  }),
});

function BookingPage() {
  const { t } = useTranslation();
  return (
    <SiteLayout>
      <PageHero eyebrow="Booking" title={t("nav.book")} subtitle="Шесть простых шагов до вашего отдыха." videoSrc="/media/rooms.mp4" />
      <section className="bg-background py-24">
        <div className="mx-auto max-w-3xl px-4 text-center text-muted-foreground sm:px-6 lg:px-8">
          <p className="font-serif text-2xl text-navy">{t("pages.soonTitle")}</p>
          <p className="mt-4">Шаги бронирования и оплата подключим на Этапе 3–4.</p>
        </div>
      </section>
    </SiteLayout>
  );
}
