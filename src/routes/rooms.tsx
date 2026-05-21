import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";

export const Route = createFileRoute("/rooms")({
  component: RoomsPage,
  head: () => ({
    meta: [
      { title: "Номера и сьюты — Отель «Полуостров»" },
      { name: "description", content: "Номера и сьюты отеля «Полуостров» с видами на океан и вулканы Камчатки." },
    ],
  }),
});

function RoomsPage() {
  const { t } = useTranslation();
  return (
    <SiteLayout>
      <PageHero
        eyebrow="01 — Stay"
        title={t("sections.roomsTitle")}
        subtitle={t("sections.roomsSub")}
      />
      <section className="bg-background py-24">
        <div className="mx-auto max-w-3xl px-4 text-center text-muted-foreground sm:px-6 lg:px-8">
          <p className="font-serif text-2xl text-navy">{t("pages.soonTitle")}</p>
          <p className="mt-4">{t("pages.soonText")}</p>
        </div>
      </section>
    </SiteLayout>
  );
}
