import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";

export const Route = createFileRoute("/wellness")({
  component: WellnessPage,
  head: () => ({
    meta: [
      { title: "Оздоровление — Отель «Полуостров»" },
      { name: "description", content: "Термальные ванны, спа и оздоровительные процедуры в отеле «Полуостров»." },
    ],
  }),
});

function WellnessPage() {
  const { t } = useTranslation();
  return (
    <SiteLayout>
      <PageHero
        eyebrow="02 — Wellness"
        title={t("sections.wellnessTitle")}
        subtitle={t("sections.wellnessSub")}
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
