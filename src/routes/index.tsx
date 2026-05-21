import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, ImageIcon } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import introBuilding from "@/assets/intro-building.webp";
import aboutBuilding from "@/assets/about-building.webp";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Отель «Полуостров» — бутик-отель на Камчатке" },
      {
        name: "description",
        content:
          "Бутик-отель «Полуостров» в Петропавловске-Камчатском. Виды на океан и вулканы, ресторан, оздоровление, трансфер. Бронирование онлайн.",
      },
    ],
    links: [
      { rel: "preload", as: "image", href: "/media/hero-poster.jpg", fetchpriority: "high" },
      { rel: "preload", as: "video", href: "/media/hero.mp4", type: "video/mp4" },
    ],
  }),
});

function Home() {
  return (
    <SiteLayout>
      <Hero />
      <Intro />
      <AboutShowcase />
      <RoomsBlock />
      <WellnessBlock />
      {/* RestaurantBlock убран по запросу */}
      <ServicesBlock />
    </SiteLayout>
  );
}

function AboutShowcase() {
  const { t } = useTranslation();
  return (
    <section className="bg-cream py-20 sm:py-28" aria-label="Отель «Полуостров»">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-10 px-4 sm:px-6 md:grid-cols-10 lg:gap-14 lg:px-8">
        <div className="md:col-span-7">
          <img
            src={aboutBuilding}
            alt="Здание отеля «Полуостров» и ресторана «Артишок»"
            className="h-[60vh] min-h-[420px] w-full object-cover md:h-[70vh]"
            style={{ borderRadius: "2px" }}
            loading="lazy"
          />
        </div>
        <div className="flex flex-col justify-center md:col-span-3">
          <p className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold">
            {t("sections.aboutTitle")}
          </p>
          <h2 className="font-serif text-4xl leading-tight text-navy sm:text-5xl">
            {t("sections.aboutTitle")}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            {t("sections.aboutText")}
          </p>
          <Link
            to="/about"
            className="mt-8 inline-flex h-12 w-fit items-center justify-center bg-navy px-9 text-[11px] tracking-widest-plus uppercase text-cream transition-colors hover:bg-gold hover:text-navy"
            style={{ borderRadius: "2px" }}
          >
            {t("sections.discover")}
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

function Hero() {
  const { t } = useTranslation();
  return (
    <section className="relative h-screen min-h-[640px] w-full overflow-hidden bg-navy">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/media/hero.mp4"
        poster="/media/hero-poster.jpg"
        preload="auto"
        autoPlay
        muted
        loop
        playsInline
      />
      

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-cream">
        <p className="mb-6 text-[11px] tracking-widest-plus uppercase text-cream/80">
          {t("hero.eyebrow")}
        </p>
        <h1 className="max-w-4xl font-serif text-5xl leading-[1.05] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
          {t("hero.title")}
        </h1>
        <p className="mt-7 max-w-xl text-base text-cream/85 sm:text-lg">
          {t("hero.subtitle")}
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/booking"
            className="inline-flex h-12 items-center justify-center bg-cream px-9 text-[11px] tracking-widest-plus uppercase text-navy transition-colors hover:bg-gold hover:text-navy"
            style={{ borderRadius: "2px" }}
          >
            {t("hero.cta")}
          </Link>
          <Link
            to="/rooms"
            className="inline-flex h-12 items-center justify-center border border-cream/60 px-9 text-[11px] tracking-widest-plus uppercase text-cream transition-colors hover:bg-cream hover:text-navy"
            style={{ borderRadius: "2px" }}
          >
            {t("hero.ctaSecondary")}
          </Link>
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[10px] tracking-widest-plus uppercase text-cream/60">
        Scroll
      </div>
    </section>
  );
}

function Intro() {
  const { t } = useTranslation();
  return (
    <section className="bg-cream py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <p className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold">
          {t("sections.aboutTitle")}
        </p>
        <h2 className="font-serif text-4xl text-navy sm:text-5xl">
          Камчатка, как вы её ещё не видели
        </h2>
        <p className="mt-7 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("sections.aboutText")}
        </p>
        <Link
          to="/about"
          className="mt-8 inline-flex items-center gap-2 text-[11px] tracking-widest-plus uppercase text-navy hover:text-gold"
        >
          {t("sections.discover")} <ArrowRight className="h-3 w-3" />
        </Link>
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
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  placeholderLabel: string;
  imageSrc?: string;
  href: string;
  reverse?: boolean;
}) {
  const { t } = useTranslation();
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
          <p className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold">
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
            {t("sections.discover")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function RoomsBlock() {
  const { t } = useTranslation();
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <p className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold">
          01 — Stay
        </p>
        <h2 className="font-serif text-4xl text-navy sm:text-5xl">
          {t("sections.roomsTitle")}
        </h2>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          {t("sections.roomsSub")}
        </p>
        <Link
          to="/rooms"
          className="mt-8 inline-flex h-11 items-center bg-navy px-7 text-[11px] tracking-widest-plus uppercase text-cream transition-colors hover:bg-gold hover:text-navy"
          style={{ borderRadius: "2px" }}
        >
          {t("sections.discover")}
        </Link>
      </div>
    </section>
  );
}

function WellnessBlock() {
  const { t } = useTranslation();
  return (
    <div className="bg-light-gray">
      <FeatureBlock
        eyebrow="02 — Wellness"
        title={t("sections.wellnessTitle")}
        subtitle={t("sections.wellnessSub")}
        placeholderLabel="Фото SPA / wellness"
        href="/wellness"
        reverse
      />
    </div>
  );
}


function ServicesBlock() {
  const { t } = useTranslation();
  const items = [
    { num: "01", title: "Трансфер", text: "Из аэропорта и по городу на премиальных авто." },
    { num: "02", title: "Экскурсии", text: "Вулканы, океан, термальные источники." },
    { num: "03", title: "Консьерж", text: "Бронирование, советы, особые запросы 24/7." },
    { num: "04", title: "Завтрак", text: "Камчатская кухня от шеф-повара ресторана." },
  ];
  return (
    <section className="bg-navy py-24 text-cream sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 max-w-2xl">
          <p className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold">
            04 — Services
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl">{t("sections.servicesTitle")}</h2>
          <p className="mt-5 text-cream/70">{t("sections.servicesSub")}</p>
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
