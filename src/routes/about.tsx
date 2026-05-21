import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "Об отеле — «Полуостров»" },
      { name: "description", content: "О бутик-отеле «Полуостров» на Камчатке." },
    ],
  }),
});

function AboutPage() {
  const { t } = useTranslation();
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About"
        title={t("sections.aboutTitle")}
        subtitle={t("sections.aboutText")}
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
