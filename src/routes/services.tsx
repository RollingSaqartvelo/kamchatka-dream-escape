import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";
import { loadServicesContent, SERVICES_DEFAULT, type ServicesContent } from "@/lib/site-content";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
  head: () => ({
    meta: [
      { title: "Услуги — Отель «Полуостров»" },
      { name: "description", content: "Услуги отеля «Полуостров»: питание, трансфер из аэропорта Елизово, ранний заезд и поздний выезд." },
    ],
  }),
});

const rub = (n: number) => `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;

function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const total = photos.length;
  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const next = () => setIndex((i) => (i + 1) % total);
  if (total === 0)
    return <div className="aspect-[4/3] bg-beige" style={{ borderRadius: "2px" }} />;
  const safe = index % total;

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-beige" style={{ borderRadius: "2px" }}>
      <img
        src={photos[safe]}
        alt={`${alt} — фото ${safe + 1}`}
        className="h-full w-full object-cover transition-opacity duration-500"
        key={safe}
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
        {safe + 1} / {total}
      </div>
    </div>
  );
}

function Price({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="mt-8 flex items-baseline gap-3 border-t border-beige pt-6">
      <span className="text-[11px] tracking-widest-plus uppercase text-gold">Стоимость</span>
      <span className="font-serif text-3xl text-navy">{value}</span>
      <span className="text-sm text-muted-foreground">{unit}</span>
    </div>
  );
}

function ServicesPage() {
  const { t } = useTranslation();
  const [c, setC] = useState<ServicesContent>(SERVICES_DEFAULT);
  useEffect(() => {
    void loadServicesContent().then(setC).catch(() => {});
  }, []);
  const p = c.prices;
  return (
    <SiteLayout>
      <PageHero
        eyebrow="04 — Services"
        title={t("sections.servicesTitle")}
        subtitle={t("sections.servicesSub")}
        videoSrc="/media/services.mp4"
      />

      {/* Трансфер */}
      <section className="bg-cream py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] tracking-widest-plus uppercase text-gold">Услуги</p>
            <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">Трансфер</h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              Встретим в аэропорту Елизово (PKC) и доставим в отель — и обратно.
              Закажите трансфер заранее при бронировании.
            </p>
          </div>
          <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
            <div className="border border-beige bg-background p-8" style={{ borderRadius: "2px" }}>
              <h3 className="font-serif text-2xl text-navy">Легковой автомобиль</h3>
              <p className="mt-3 text-sm text-muted-foreground">Аэропорт Елизово ↔ отель, до 3 пассажиров</p>
              <div className="mt-6 flex items-baseline gap-2 border-t border-beige pt-6">
                <span className="font-serif text-3xl text-navy">{rub(p.transferCar)}</span>
                <span className="text-sm text-muted-foreground">/ поездка</span>
              </div>
            </div>
            <div className="border border-beige bg-background p-8" style={{ borderRadius: "2px" }}>
              <h3 className="font-serif text-2xl text-navy">Микроавтобус</h3>
              <p className="mt-3 text-sm text-muted-foreground">Аэропорт Елизово ↔ отель, для группы</p>
              <div className="mt-6 flex items-baseline gap-2 border-t border-beige pt-6">
                <span className="font-serif text-3xl text-navy">{rub(p.transferMinibus)}</span>
                <span className="text-sm text-muted-foreground">/ поездка</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ранний заезд / поздний выезд */}
      <section className="bg-background py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] tracking-widest-plus uppercase text-gold">Услуги</p>
            <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">Ранний заезд и поздний выезд</h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              Расчётный час: заезд с 14:00, выезд до 12:00. Нужно раньше или позже —
              доплата 50 % стоимости за ночь. Уточните возможность при бронировании.
            </p>
          </div>
          <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
            <div className="border border-beige bg-cream p-8" style={{ borderRadius: "2px" }}>
              <h3 className="font-serif text-2xl text-navy">Ранний заезд</h3>
              <p className="mt-3 text-sm text-muted-foreground">Заселение до 14:00</p>
              <div className="mt-6 flex items-baseline gap-2 border-t border-beige pt-6">
                <span className="font-serif text-3xl text-navy">{p.earlyCheckin}</span>
                <span className="text-sm text-muted-foreground">от стоимости за ночь</span>
              </div>
            </div>
            <div className="border border-beige bg-cream p-8" style={{ borderRadius: "2px" }}>
              <h3 className="font-serif text-2xl text-navy">Поздний выезд</h3>
              <p className="mt-3 text-sm text-muted-foreground">Выезд после 12:00</p>
              <div className="mt-6 flex items-baseline gap-2 border-t border-beige pt-6">
                <span className="font-serif text-3xl text-navy">{p.lateCheckout}</span>
                <span className="text-sm text-muted-foreground">от стоимости за ночь</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Завтрак */}
      <section className="bg-cream py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <PhotoGallery photos={c.photos.breakfast} alt="Завтрак в отеле «Полуостров»" />
            <div>
              <p className="text-[11px] tracking-widest-plus uppercase text-gold">Гастрономия</p>
              <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">Завтрак</h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                Комплексный завтрак по предварительному заказу — приготовлен из локальных
                продуктов и подаётся в нашем ресторане.
              </p>
              <Price value={rub(p.breakfast)} unit="/ гость в сутки" />
              <p className="mt-6 text-xs tracking-widest-plus uppercase text-muted-foreground">
                Заказ принимается до 20:00 предыдущего дня
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Обед */}
      <section className="bg-background py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="lg:order-2">
              <PhotoGallery photos={c.photos.dishes} alt="Блюда кухни отеля «Полуостров»" />
            </div>
            <div className="lg:order-1">
              <p className="text-[11px] tracking-widest-plus uppercase text-gold">Гастрономия</p>
              <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">Обед</h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                Комплексный обед из локальных продуктов — по предварительному заказу.
              </p>
              <Price value={rub(p.lunch)} unit="/ гость в сутки" />
            </div>
          </div>
        </div>
      </section>

      {/* Ужин */}
      <section className="bg-cream py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <PhotoGallery photos={c.photos.dinner} alt="Ужин в отеле «Полуостров»" />
            <div>
              <p className="text-[11px] tracking-widest-plus uppercase text-gold">Гастрономия</p>
              <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">Ужин</h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                Комплексный ужин по предварительному заказу — салат, горячее блюдо,
                гарнир и домашний напиток.
              </p>
              <Price value={rub(p.dinner)} unit="/ гость в сутки" />
              <p className="mt-6 text-xs tracking-widest-plus uppercase text-muted-foreground">
                Заказ принимается до 14:00 в день подачи
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Пансионы */}
      <section className="bg-background py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] tracking-widest-plus uppercase text-gold">Питание</p>
            <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">Пакеты питания</h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              Закажите питание на весь срок проживания — выгоднее, чем по отдельности.
            </p>
          </div>
          <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
            <div className="border border-beige bg-cream p-8" style={{ borderRadius: "2px" }}>
              <h3 className="font-serif text-2xl text-navy">Полупансион</h3>
              <p className="mt-3 text-sm text-muted-foreground">Завтрак и ужин</p>
              <div className="mt-6 flex items-baseline gap-2 border-t border-beige pt-6">
                <span className="font-serif text-3xl text-navy">{rub(p.halfBoard)}</span>
                <span className="text-sm text-muted-foreground">/ гость в сутки</span>
              </div>
            </div>
            <div className="border border-beige bg-cream p-8" style={{ borderRadius: "2px" }}>
              <h3 className="font-serif text-2xl text-navy">Полный пансион</h3>
              <p className="mt-3 text-sm text-muted-foreground">Завтрак, обед и ужин</p>
              <div className="mt-6 flex items-baseline gap-2 border-t border-beige pt-6">
                <span className="font-serif text-3xl text-navy">{rub(p.fullBoard)}</span>
                <span className="text-sm text-muted-foreground">/ гость в сутки</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
