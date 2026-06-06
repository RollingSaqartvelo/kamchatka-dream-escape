import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ImageIcon } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ReviewsBlock } from "@/components/sections/ReviewsBlock";
import { usePageContent, type PageGetters } from "@/lib/site-content";
import { HOME_ABOUT_DEF, HOME_WELLNESS_DEF } from "@/lib/content-registry";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Отель «Полуостров» — гостиница на Камчатке | Poluostrov Hotel Kamchatka" },
      {
        name: "description",
        content:
          "Бутик-отель «Полуостров» в Петропавловске-Камчатском. Виды на океан и вулканы, ресторан, оздоровление, трансфер. Бронирование онлайн.",
      },
    ],
    links: [
      { rel: "preload", as: "image", href: "/media/hero-poster.jpg", fetchpriority: "high" },
    ],
  }),
});

function Home() {
  const c = usePageContent("home");
  return (
    <SiteLayout>
      <Hero c={c} />
      {!c.hidden("about") && <AboutShowcase c={c} />}
      {!c.hidden("rooms") && <RoomsBlock c={c} />}
      {!c.hidden("wellness") && <WellnessBlock c={c} />}
      {!c.hidden("homeservices") && <ServicesBlock c={c} />}
      <ReviewsBlock />
    </SiteLayout>
  );
}

function AboutShowcase({ c }: { c: PageGetters }) {
  const { t } = useTranslation();
  return (
    <section className="bg-cream py-20 sm:py-28" aria-label="Отель «Полуостров»">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-10 px-4 sm:px-6 md:grid-cols-10 lg:gap-14 lg:px-8">
        <div className="md:col-span-7">
          <img
            src={c.image("about.photo", HOME_ABOUT_DEF[0])}
            alt="Здание отеля «Полуостров» и ресторана «Артишок»"
            className="h-[60vh] min-h-[420px] w-full object-cover md:h-[70vh]"
            style={{ borderRadius: "2px" }}
            loading="lazy"
          />
        </div>
        <div className="flex flex-col justify-center md:col-span-3">
          <p className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold-ink">
            {c.text("about.eyebrow", t("sections.aboutTitle"))}
          </p>
          <h2 className="font-serif text-4xl leading-tight text-navy sm:text-5xl">
            {c.text("about.title", t("home.introTitle"))}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            {c.text("about.text", t("sections.aboutText"))}
          </p>
          <Link
            to="/about"
            className="mt-8 inline-flex h-12 w-fit items-center justify-center bg-navy px-9 text-[11px] tracking-widest-plus uppercase text-cream transition-colors hover:bg-gold hover:text-navy"
            style={{ borderRadius: "2px" }}
          >
            {c.text("about.cta", t("sections.discover"))}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Empty image placeholder — waiting for user-supplied media. */
function MediaPlaceholder({
  label,
  className = "",
  ratio = "aspect-[4/3]",
}: {
  label: string;
  className?: string;
  ratio?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-beige/60 ${ratio} ${className}`}
      style={{ borderRadius: "2px" }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_46%,rgba(184,151,106,0.18)_47%,rgba(184,151,106,0.18)_53%,transparent_54%)] bg-[length:18px_18px]" />
      <div className="relative flex flex-col items-center gap-3 text-navy/40">
        <ImageIcon className="h-8 w-8" strokeWidth={1} />
        <span className="text-[10px] tracking-widest-plus uppercase">{label}</span>
      </div>
    </div>
  );
}

function Hero({ c }: { c: PageGetters }) {
  const { t } = useTranslation();
  return (
    <section className="relative h-screen min-h-[640px] w-full overflow-hidden bg-navy">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/media/hero.mp4"
        poster="/media/hero-poster.jpg"
        preload="metadata"
        autoPlay
        muted
        loop
        playsInline
        aria-label="Вид на гостиницу Полуостров и Камчатку"
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-cream">
        <p className="mb-6 text-[11px] tracking-widest-plus uppercase text-cream/80">
          {c.text("hero.eyebrow", t("hero.eyebrow"))}
        </p>
        <h1 className="max-w-4xl font-serif text-5xl leading-[1.05] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
          {c.text("hero.title", t("hero.title"))}
        </h1>
        <p className="mt-7 max-w-xl text-base text-cream/85 sm:text-lg">
          {c.text("hero.subtitle", t("hero.subtitle"))}
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/booking"
            className="inline-flex h-12 items-center justify-center bg-cream px-9 text-[11px] tracking-widest-plus uppercase text-navy transition-colors hover:bg-gold hover:text-navy"
            style={{ borderRadius: "2px" }}
          >
            {c.text("hero.cta", t("hero.cta"))}
          </Link>
          <Link
            to="/rooms"
            className="inline-flex h-12 items-center justify-center border border-cream/60 px-9 text-[11px] tracking-widest-plus uppercase text-cream transition-colors hover:bg-cream hover:text-navy"
            style={{ borderRadius: "2px" }}
          >
            {c.text("hero.ctaSecondary", t("hero.ctaSecondary"))}
          </Link>
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[10px] tracking-widest-plus uppercase text-cream/60">
        {c.text("hero.scroll", t("hero.scroll"))}
      </div>
    </section>
  );
}

function FeatureBlock({
  eyebrow,
  title,
  subtitle,
  placeholderLabel,
  imageSrc,
  href,
  cta,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  placeholderLabel: string;
  imageSrc?: string;
  href: string;
  cta: string;
  reverse?: boolean;
}) {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 md:grid-cols-2 lg:gap-20 lg:px-8">
        <div className={reverse ? "md:order-2" : ""}>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={placeholderLabel}
              className="aspect-[4/3] w-full object-cover"
              style={{ borderRadius: "2px" }}
            />
          ) : (
            <MediaPlaceholder label={placeholderLabel} />
          )}
        </div>
        <div className={reverse ? "md:order-1" : ""}>
          <p className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold-ink">
            {eyebrow}
          </p>
          <h2 className="font-serif text-4xl text-navy sm:text-5xl">{title}</h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
          <Link
            to={href}
            className="mt-8 inline-flex h-11 items-center bg-navy px-7 text-[11px] tracking-widest-plus uppercase text-cream transition-colors hover:bg-gold hover:text-navy"
            style={{ borderRadius: "2px" }}
          >
            {cta}
          </Link>
        </div>
      </div>
    </section>
  );
}

function RoomsBlock({ c }: { c: PageGetters }) {
  const { t } = useTranslation();
  const stats = [
    { icon: "🛏", title: c.text("rooms.stat1Title", t("home.roomsBlock.stat1Title")), caption: c.text("rooms.stat1Sub", t("home.roomsBlock.stat1Sub")) },
    { icon: "🌊", title: c.text("rooms.stat2Title", t("home.roomsBlock.stat2Title")), caption: c.text("rooms.stat2Sub", t("home.roomsBlock.stat2Sub")) },
    { icon: "✓", title: c.text("rooms.stat3Title", t("home.roomsBlock.stat3Title")), caption: c.text("rooms.stat3Sub", t("home.roomsBlock.stat3Sub")) },
  ];
  return (
    <section className="bg-cream py-20 sm:py-28">
      <div className="mx-auto max-w-[720px] px-4 text-center sm:px-6 lg:px-8">
        <p className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold-ink">
          {c.text("rooms.eyebrow", t("home.roomsBlock.eyebrow"))}
        </p>
        <h2 className="font-serif text-4xl text-navy sm:text-5xl">
          {c.text("rooms.title", t("sections.roomsTitle"))}
        </h2>
        <p className="mt-6 font-serif text-xl italic text-navy/80 sm:text-2xl">
          {c.text("rooms.tagline", t("home.roomsBlock.tagline"))}
        </p>
        <p className="mt-8 text-base leading-loose text-muted-foreground">
          {c.text("rooms.body", t("home.roomsBlock.body"))}
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-0">
          {stats.map((item, i) => (
            <div
              key={item.title}
              className={`flex flex-col items-center px-4 ${
                i > 0 ? "sm:border-l sm:border-border" : ""
              }`}
            >
              <div className="mb-3 text-2xl text-gold-ink">{item.icon}</div>
              <div className="font-serif text-2xl text-navy">{item.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.caption}</div>
            </div>
          ))}
        </div>

        <Link
          to="/rooms"
          className="mt-12 inline-flex h-12 items-center justify-center bg-navy px-12 text-[11px] tracking-widest-plus uppercase text-cream transition-colors hover:bg-gold hover:text-navy"
          style={{ borderRadius: "2px" }}
        >
          {c.text("rooms.cta", t("home.roomsBlock.cta"))}
        </Link>
      </div>
    </section>
  );
}

function WellnessBlock({ c }: { c: PageGetters }) {
  const { t } = useTranslation();
  return (
    <div className="bg-light-gray">
      <FeatureBlock
        eyebrow={c.text("wellness.eyebrow", "02 — Wellness")}
        title={c.text("wellness.title", t("sections.wellnessTitle"))}
        subtitle={c.text("wellness.subtitle", t("sections.wellnessSub"))}
        placeholderLabel="Фото SPA / wellness"
        imageSrc={c.image("wellness.photo", HOME_WELLNESS_DEF[0])}
        href="/wellness"
        cta={t("sections.discover")}
        reverse
      />
    </div>
  );
}

function ServicesBlock({ c }: { c: PageGetters }) {
  const { t } = useTranslation();
  const items = [
    { num: "01", title: c.text("homeservices.i1Title", t("home.services.i1Title")), text: c.text("homeservices.i1Text", t("home.services.i1Text")) },
    { num: "02", title: c.text("homeservices.i2Title", t("home.services.i2Title")), text: c.text("homeservices.i2Text", t("home.services.i2Text")) },
    { num: "03", title: c.text("homeservices.i3Title", t("home.services.i3Title")), text: c.text("homeservices.i3Text", t("home.services.i3Text")) },
    { num: "04", title: c.text("homeservices.i4Title", t("home.services.i4Title")), text: c.text("homeservices.i4Text", t("home.services.i4Text")) },
  ];
  return (
    <section className="bg-navy py-24 text-cream sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 max-w-2xl">
          <p className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold">
            {c.text("homeservices.eyebrow", t("home.services.eyebrow"))}
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl">{c.text("homeservices.title", t("sections.servicesTitle"))}</h2>
          <p className="mt-5 text-cream/70">{c.text("homeservices.subtitle", t("sections.servicesSub"))}</p>
        </div>
        <div className="grid grid-cols-1 gap-px bg-cream/10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.num} className="bg-navy p-8 transition-colors hover:bg-navy/70">
              <div className="mb-6 font-serif text-3xl italic text-gold">{it.num}</div>
              <h3 className="font-serif text-xl">{it.title}</h3>
              <p className="mt-3 text-sm text-cream/60">{it.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
