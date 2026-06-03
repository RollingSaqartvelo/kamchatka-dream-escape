import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";
import { getArticles } from "@/data/kamchatka-articles";

export const Route = createFileRoute("/kamchatka/")({
  component: KamchatkaPage,
  head: () => ({
    meta: [
      { title: "О Камчатке — статьи и гид по краю вулканов | «Полуостров»" },
      {
        name: "description",
        content:
          "Авторские статьи о Камчатке: вулканы, океан, термальные источники, гастрономия и культура коренных народов.",
      },
      { property: "og:title", content: "О Камчатке — статьи и гид по краю вулканов" },
      {
        property: "og:description",
        content:
          "Откройте для себя Камчатку через истории о вулканах, океане, термальных источниках и местной кухне.",
      },
    ],
  }),
});

function KamchatkaPage() {
  const { t, i18n } = useTranslation();
  const articles = getArticles(i18n.language);
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <SiteLayout>
      <PageHero
        eyebrow={t("kamchatka.guide")}
        title={t("kamchatka.title")}
        subtitle={t("kamchatka.subtitle")}
        videoSrc="/media/kamchatka-hero.mp4"
      />

      {/* Featured */}
      <section className="bg-cream py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-10 text-center text-[11px] tracking-widest-plus uppercase text-gold-ink">
            {t("kamchatka.mainStory")}
          </p>
          <article className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="aspect-[4/3] overflow-hidden bg-beige" style={{ borderRadius: "2px" }}>
              <img
                src={featured.image}
                alt={featured.title}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
            <div>
              <p className="text-[11px] tracking-widest-plus uppercase text-gold-ink">
                {featured.category} · {featured.readingTime}
              </p>
              <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">
                {featured.title}
              </h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                {featured.excerpt}
              </p>
              <Link
                to="/kamchatka/$slug"
                params={{ slug: featured.slug }}
                className="mt-8 inline-flex items-center gap-3 text-[11px] tracking-widest-plus uppercase text-navy hover:text-gold-ink"
              >
                {t("kamchatka.readArticle")}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* Grid */}
      <section className="bg-background py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 flex items-end justify-between">
            <div>
              <p className="text-[11px] tracking-widest-plus uppercase text-gold-ink">
                {t("kamchatka.journal")}
              </p>
              <h3 className="mt-3 font-serif text-3xl text-navy sm:text-4xl">
                {t("kamchatka.allArticles")}
              </h3>
            </div>
            <p className="hidden text-sm text-muted-foreground sm:block">
              {t("kamchatka.articlesCount", { n: articles.length })}
            </p>
          </div>

          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((a) => (
              <Link
                key={a.slug}
                to="/kamchatka/$slug"
                params={{ slug: a.slug }}
                className="group block"
              >
                <div
                  className="aspect-[4/5] overflow-hidden bg-beige"
                  style={{ borderRadius: "2px" }}
                >
                  <img
                    src={a.image}
                    alt={a.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <p className="mt-5 text-[11px] tracking-widest-plus uppercase text-gold-ink">
                  {a.category} · {a.readingTime}
                </p>
                <h4 className="mt-3 font-serif text-2xl text-navy transition-colors group-hover:text-gold-ink">
                  {a.title}
                </h4>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {a.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy py-24 text-cream">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-[11px] tracking-widest-plus uppercase text-gold">
            {t("kamchatka.ctaEyebrow")}
          </p>
          <h3 className="mt-5 font-serif text-4xl sm:text-5xl">
            {t("kamchatka.ctaTitle")}
          </h3>
          <p className="mt-6 text-cream/80">{t("kamchatka.ctaText")}</p>
          <Link
            to="/booking"
            className="mt-10 inline-flex h-12 items-center bg-cream px-8 text-[11px] tracking-widest-plus uppercase text-navy hover:bg-cream/90"
            style={{ borderRadius: "2px" }}
          >
            {t("kamchatka.ctaBtn")}
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
