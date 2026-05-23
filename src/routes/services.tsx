import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
  head: () => ({
    meta: [
      { title: "Услуги — Отель «Полуостров»" },
      { name: "description", content: "Услуги отеля «Полуостров»: завтрак, трансфер, экскурсии, консьерж, ресторан." },
    ],
  }),
});

const breakfastPhotos = [
  "/media/breakfast-1.webp",
  "/media/breakfast-2.webp",
  "/media/breakfast-3.webp",
  "/media/breakfast-4.webp",
];

const dinnerPhotos = [
  "/media/dinner-1.webp",
  "/media/dinner-2.webp",
  "/media/dinner-3.webp",
];

function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const total = photos.length;
  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const next = () => setIndex((i) => (i + 1) % total);

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-beige" style={{ borderRadius: "2px" }}>
      <img
        src={photos[index]}
        alt={`${alt} — фото ${index + 1}`}
        className="h-full w-full object-cover transition-opacity duration-500"
        key={index}
      />
      <button
        type="button"
        onClick={prev}
        aria-label="Предыдущее фото"
        className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-cream/90 text-navy backdrop-blur-sm transition hover:bg-cream"
        style={{ borderRadius: "2px" }}
      >
        <span aria-hidden className="text-lg">←</span>
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Следующее фото"
        className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-cream/90 text-navy backdrop-blur-sm transition hover:bg-cream"
        style={{ borderRadius: "2px" }}
      >
        <span aria-hidden className="text-lg">→</span>
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-navy/70 px-3 py-1 text-[10px] tracking-widest-plus uppercase text-cream" style={{ borderRadius: "2px" }}>
        {index + 1} / {total}
      </div>
    </div>
  );
}





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

      <section className="bg-cream py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <PhotoGallery photos={breakfastPhotos} alt="Завтрак в отеле «Полуостров»" />
            <div>
              <p className="text-[11px] tracking-widest-plus uppercase text-gold">
                Гастрономия
              </p>
              <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">
                Завтрак
              </h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                Комплексный завтрак по предварительному заказу — приготовлен из локальных
                продуктов и подаётся в нашем ресторане.
              </p>
              <div className="mt-8 flex items-baseline gap-3 border-t border-beige pt-6">
                <span className="text-[11px] tracking-widest-plus uppercase text-gold">
                  Стоимость
                </span>
                <span className="font-serif text-3xl text-navy">400 ₽</span>
                <span className="text-sm text-muted-foreground">/ персона</span>
              </div>
              <p className="mt-6 text-xs tracking-widest-plus uppercase text-muted-foreground">
                Заказ принимается до 20:00 предыдущего дня
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="lg:order-2">
              <PhotoGallery photos={dinnerPhotos} alt="Ужин в отеле «Полуостров»" />
            </div>
            <div className="lg:order-1">
              <p className="text-[11px] tracking-widest-plus uppercase text-gold">
                Гастрономия
              </p>
              <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">
                Ужин
              </h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                Комплексный ужин по предварительному заказу — салат, горячее блюдо,
                гарнир и домашний напиток.
              </p>
              <div className="mt-8 flex items-baseline gap-3 border-t border-beige pt-6">
                <span className="text-[11px] tracking-widest-plus uppercase text-gold">
                  Стоимость
                </span>
                <span className="font-serif text-3xl text-navy">800 ₽</span>
                <span className="text-sm text-muted-foreground">/ персона</span>
              </div>
              <p className="mt-6 text-xs tracking-widest-plus uppercase text-muted-foreground">
                Заказ принимается до 14:00 в день подачи
              </p>
            </div>
          </div>
        </div>
      </section>


      <section className="bg-background py-24">
        <div className="mx-auto max-w-3xl px-4 text-center text-muted-foreground sm:px-6 lg:px-8">
          <p className="font-serif text-2xl text-navy">{t("pages.soonTitle")}</p>
          <p className="mt-4">{t("pages.soonText")}</p>
        </div>
      </section>
    </SiteLayout>
  );
}
