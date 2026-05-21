import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
  head: () => ({
    meta: [
      { title: "Услуги — Отель «Полуостров»" },
      { name: "description", content: "Услуги отеля «Полуостров»: трансфер, экскурсии, консьерж, ресторан." },
    ],
  }),
});

function ServicesPage() {
  const { t } = useTranslation();
  return (
    <SiteLayout>
      <PageHero
        eyebrow="04 — Services"
        title={t("sections.servicesTitle")}
        subtitle={t("sections.servicesSub")}
        videoSrc="/media/services.mp4"
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
