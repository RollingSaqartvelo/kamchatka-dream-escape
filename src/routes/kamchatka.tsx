import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";

export const Route = createFileRoute("/kamchatka")({
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

type Article = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  readingTime: string;
  image: string;
};

const articles: Article[] = [
  {
    slug: "wild-nature",
    category: "О крае",
    title: "Камчатка: край дикой природы, вулканов и суровых нравов",
    excerpt:
      "Полуостров длиной 1200 км — от Ключевской сопки и Авачинской бухты до коряков, ительменов и Долины гейзеров. Большой гид по краю.",
    readingTime: "20 мин чтения",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80",
  },
  {
    slug: "thermal-springs",
    category: "Оздоровление",
    title: "Термальные источники полуострова",
    excerpt:
      "Паратунка, Малки, Налычево — где найти воду температурой 40°C под открытым небом и какие источники доступны круглый год.",
    readingTime: "6 мин чтения",
    image:
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1600&q=80",
  },
  {
    slug: "ocean",
    category: "Океан",
    title: "Авачинская бухта: вторая по величине в мире",
    excerpt:
      "Морские прогулки к острову Старичков, наблюдение за касатками и сивучами, рыбалка на палтуса — что попробовать на воде.",
    readingTime: "7 мин чтения",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
  },
  {
    slug: "cuisine",
    category: "Гастрономия",
    title: "Камчатская кухня: краб, икра, папоротник",
    excerpt:
      "Что попробовать обязательно — от свежего камчатского краба и икры пятой минуты до медвежатины и юколы по рецептам ительменов.",
    readingTime: "5 мин чтения",
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80",
  },
  {
    slug: "indigenous",
    category: "Культура",
    title: "Коренные народы Камчатки",
    excerpt:
      "Ительмены, коряки, эвены, алеуты — четыре культуры, сохранившие древние традиции охоты, шаманизма и танца Алхалалалай.",
    readingTime: "9 мин чтения",
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
  },
  {
    slug: "seasons",
    category: "Путешествие",
    title: "Когда ехать на Камчатку",
    excerpt:
      "Хели-ски в марте, цветение тундры в июле, нерест лосося в августе, медведи на Курильском озере в сентябре — календарь сезонов.",
    readingTime: "6 мин чтения",
    image:
      "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=1600&q=80",
  },
];

function KamchatkaPage() {
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Гид по краю"
        title="О Камчатке"
        subtitle="Истории о земле вулканов, океана и тишины — от наших консьержей и проводников."
        videoSrc="/media/about.mp4"
      />

      {/* Featured */}
      <section className="bg-cream py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-10 text-center text-[11px] tracking-widest-plus uppercase text-gold">
            Главная история
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
              <p className="text-[11px] tracking-widest-plus uppercase text-gold">
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
                className="mt-8 inline-flex items-center gap-3 text-[11px] tracking-widest-plus uppercase text-navy hover:text-gold"
              >
                Читать статью
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
              <p className="text-[11px] tracking-widest-plus uppercase text-gold">
                Журнал
              </p>
              <h3 className="mt-3 font-serif text-3xl text-navy sm:text-4xl">
                Все статьи
              </h3>
            </div>
            <p className="hidden text-sm text-muted-foreground sm:block">
              {articles.length} материалов
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
                <p className="mt-5 text-[11px] tracking-widest-plus uppercase text-gold">
                  {a.category} · {a.readingTime}
                </p>
                <h4 className="mt-3 font-serif text-2xl text-navy transition-colors group-hover:text-gold">
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
            Готовы к путешествию
          </p>
          <h3 className="mt-5 font-serif text-4xl sm:text-5xl">
            Откройте Камчатку из «Полуострова»
          </h3>
          <p className="mt-6 text-cream/80">
            Наш консьерж составит маршрут — от восхождения на вулкан до ужина с видом на бухту.
          </p>
          <Link
            to="/booking"
            className="mt-10 inline-flex h-12 items-center bg-cream px-8 text-[11px] tracking-widest-plus uppercase text-navy hover:bg-cream/90"
            style={{ borderRadius: "2px" }}
          >
            Забронировать номер
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
