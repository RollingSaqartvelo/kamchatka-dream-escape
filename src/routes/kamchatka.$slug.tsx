import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import {
  getArticle,
  type ArticleSection,
} from "@/data/kamchatka-articles";

export const Route = createFileRoute("/kamchatka/$slug")({
  loader: ({ params }) => {
    // Load RU as the canonical existence check; the component will pick the user's locale.
    const a = getArticle("ru", params.slug);
    if (!a) throw notFound();
    return { slug: params.slug, ruArticle: a };
  },
  head: ({ loaderData }) => {
    const a = loaderData?.ruArticle;
    if (!a) return { meta: [{ title: "Статья — «Полуостров»" }] };
    return {
      meta: [
        { title: `${a.title} | «Полуостров»` },
        { name: "description", content: a.subtitle },
        { property: "og:title", content: a.title },
        { property: "og:description", content: a.subtitle },
        { property: "og:image", content: a.cover },
        { property: "og:type", content: "article" },
      ],
    };
  },
  notFoundComponent: () => <ArticleNotFound />,
  errorComponent: ({ error, reset }) => <ArticleError error={error} reset={reset} />,
  component: ArticlePage,
});

function ArticleNotFound() {
  const { t } = useTranslation();
  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-32 text-center">
        <p className="text-[11px] tracking-widest-plus uppercase text-gold">404</p>
        <h1 className="mt-4 font-serif text-4xl text-navy">
          {t("kamchatka.notFoundTitle")}
        </h1>
        <Link
          to="/kamchatka"
          className="mt-8 inline-block text-[11px] tracking-widest-plus uppercase text-navy hover:text-gold"
        >
          ← {t("kamchatka.backAll")}
        </Link>
      </div>
    </SiteLayout>
  );
}

function ArticleError({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslation();
  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-32 text-center">
        <h1 className="font-serif text-3xl text-navy">{t("kamchatka.loadError")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={reset}
          className="mt-8 text-[11px] tracking-widest-plus uppercase text-navy hover:text-gold"
        >
          {t("kamchatka.retry")}
        </button>
      </div>
    </SiteLayout>
  );
}

function ArticlePage() {
  const { slug, ruArticle } = Route.useLoaderData();
  const { t, i18n } = useTranslation();
  const article = getArticle(i18n.language, slug) ?? ruArticle;

  return (
    <SiteLayout>
      {/* Hero */}
      <header className="relative h-[70vh] min-h-[480px] w-full overflow-hidden bg-navy">
        <img
          src={article.cover}
          alt={article.title}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
        <div className="relative z-10 flex h-full items-end pb-16 sm:pb-20">
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
            <p className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold">
              {article.category} · {article.readingTime}
            </p>
            <h1 className="font-serif text-4xl text-cream sm:text-5xl lg:text-6xl">
              {article.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base text-cream/80 sm:text-lg">
              {article.subtitle}
            </p>
            <p className="mt-6 text-[11px] tracking-widest-plus uppercase text-cream/60">
              {t("kamchatka.author")}: {article.author}
              {article.source && (
                <>
                  {" · "}
                  <a
                    href={article.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold hover:text-cream"
                  >
                    {t("kamchatka.source")}: {article.source.label}
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Body */}
      <article className="bg-background py-20 sm:py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          {(article.sections as ArticleSection[]).map((s, i) => {
            if (s.type === "h2") {
              return (
                <h2
                  key={i}
                  className="mt-16 mb-6 font-serif text-3xl text-navy sm:text-4xl"
                >
                  {s.text}
                </h2>
              );
            }
            if (s.type === "h3") {
              return (
                <h3
                  key={i}
                  className="mt-10 mb-4 font-serif text-2xl text-navy"
                >
                  {s.text}
                </h3>
              );
            }
            if (s.type === "quote") {
              return (
                <blockquote
                  key={i}
                  className="my-10 border-l-2 border-gold pl-6 font-serif text-xl italic text-navy"
                >
                  «{s.text}»
                  {s.author && (
                    <footer className="mt-3 text-[11px] not-italic tracking-widest-plus uppercase text-gold">
                      — {s.author}
                    </footer>
                  )}
                </blockquote>
              );
            }
            if (s.type === "figure") {
              return (
                <figure key={i} className="my-12">
                  <div
                    className="aspect-[16/10] overflow-hidden bg-beige"
                    style={{ borderRadius: "2px" }}
                  >
                    <img
                      src={s.src}
                      alt={s.caption ?? ""}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {(s.caption || s.credit) && (
                    <figcaption className="mt-3 text-xs text-muted-foreground">
                      {s.caption}
                      {s.credit && (
                        <span className="text-muted-foreground/70">
                          {s.caption ? " · " : ""}
                          {s.credit}
                        </span>
                      )}
                    </figcaption>
                  )}
                </figure>
              );
            }
            return (
              <p
                key={i}
                className="mt-5 text-[17px] leading-[1.85] text-navy/85"
              >
                {s.text}
              </p>
            );
          })}

          <div className="mt-20 border-t border-border pt-10">
            <Link
              to="/kamchatka"
              className="inline-flex items-center gap-3 text-[11px] tracking-widest-plus uppercase text-navy hover:text-gold"
            >
              <span aria-hidden>←</span> {t("kamchatka.backAll")}
            </Link>
          </div>
        </div>
      </article>
    </SiteLayout>
  );
}
