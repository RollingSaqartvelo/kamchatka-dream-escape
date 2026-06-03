import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ImageIcon, Thermometer, MapPin } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";
import { usePageContent } from "@/lib/site-content";
import { SPRINGS_DEF } from "@/lib/content-registry";

export const Route = createFileRoute("/wellness")({
  component: WellnessPage,
  head: () => ({
    meta: [
      { title: "Оздоровление — Отель «Полуостров»" },
      { name: "description", content: "Термальные источники Камчатки: Паратунка, Карымшино, Налычево, Малки и другие." },
    ],
  }),
});

function WellnessPage() {
  const { t } = useTranslation();
  const c = usePageContent("wellness");
  const springs = c.list("springs.items", SPRINGS_DEF);
  return (
    <SiteLayout>
      <PageHero
        eyebrow="02 — Wellness"
        title={t("sections.wellnessTitle")}
        subtitle={t("sections.wellnessSub")}
        videoSrc="/media/wellness.mp4"
      />

      {!c.hidden("intro") && (
        <section className="bg-background py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-[11px] tracking-widest-plus uppercase text-gold">{c.text("intro.eyebrow", "Термальная Камчатка")}</p>
            <h2 className="mt-4 font-serif text-4xl text-navy md:text-5xl">
              {c.text("intro.title", "Источники силы полуострова")}
            </h2>
            <div className="mx-auto mt-6 h-px w-16 bg-gold" />
            <p className="mt-8 leading-relaxed text-muted-foreground">
              {c.text("intro.body", "Камчатка славится многочисленными термальными источниками — каждый со своим характером, температурой и минеральным составом. Мы собрали самые значимые места, куда стоит отправиться ради настоящего оздоровления и единения с природой.")}
            </p>
          </div>
        </section>
      )}

      {!c.hidden("springs") && (
        <section className="bg-[#f9f7f4] py-20">
          <div className="mx-auto max-w-7xl space-y-20 px-4 sm:px-6 lg:px-8">
            {springs.map((spring, idx) => {
              const reversed = idx % 2 === 1;
              return (
                <article key={idx} className="grid items-center gap-10 lg:grid-cols-2">
                  <div
                    className={`flex aspect-[4/3] w-full items-center justify-center overflow-hidden border border-gold/30 bg-beige/40 ${
                      reversed ? "lg:order-2" : ""
                    }`}
                  >
                    {spring.image ? (
                      <img src={spring.image} alt={spring.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-gold/70">
                        <ImageIcon className="h-12 w-12" strokeWidth={1} />
                        <span className="text-[10px] tracking-widest-plus uppercase">Фото скоро</span>
                      </div>
                    )}
                  </div>

                  <div className={reversed ? "lg:order-1" : ""}>
                    <p className="text-[10px] tracking-widest-plus uppercase text-gold">
                      {String(idx + 1).padStart(2, "0")} — Источник
                    </p>
                    <h3 className="mt-3 font-serif text-3xl text-navy md:text-4xl">{spring.name}</h3>
                    <div className="mt-5 h-px w-12 bg-gold" />

                    <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm text-navy/80">
                      {spring.distance && (
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gold" />
                          {spring.distance}
                        </span>
                      )}
                      {spring.temp && (
                        <span className="inline-flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-gold" />
                          {spring.temp}
                        </span>
                      )}
                    </div>

                    <p className="mt-6 leading-relaxed text-muted-foreground">{spring.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!c.hidden("outro") && (
        <section className="bg-background py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <p className="font-serif text-2xl leading-relaxed text-navy md:text-3xl">
              {c.text("outro.text", "Каждый источник — это своя атмосфера и своя сила. Вместе они делают путешествие на Камчатку по-настоящему незабываемым.")}
            </p>
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
