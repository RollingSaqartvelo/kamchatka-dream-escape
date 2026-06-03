import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";
import { usePageContent } from "@/lib/site-content";
import { BREAKFAST_DEF, DINNER_DEF, DISHES_DEF } from "@/lib/content-registry";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
  head: () => ({
    meta: [
      { title: "Услуги — Отель «Полуостров»" },
      { name: "description", content: "Услуги отеля «Полуостров»: питание, трансфер из аэропорта Елизово, ранний заезд и поздний выезд." },
    ],
  }),
});

function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const total = photos.length;
  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const next = () => setIndex((i) => (i + 1) % total);
  if (total === 0) return <div className="aspect-[4/3] bg-beige" style={{ borderRadius: "2px" }} />;
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
      <span className="text-[11px] tracking-widest-plus uppercase text-gold-ink">Стоимость</span>
      <span className="font-serif text-3xl text-navy">{value}</span>
      <span className="text-sm text-muted-foreground">{unit}</span>
    </div>
  );
}

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] tracking-widest-plus uppercase text-gold-ink">{children}</p>;
}

// Карточка «название · подпись · цена/единица» (трансфер, заезд/выезд, пансионы).
function InfoCard({
  title,
  note,
  value,
  unit,
  bg,
}: {
  title: string;
  note: string;
  value: string;
  unit: string;
  bg: string;
}) {
  return (
    <div className={`border border-beige ${bg} p-8`} style={{ borderRadius: "2px" }}>
      <h3 className="font-serif text-2xl text-navy">{title}</h3>
      <p className="mt-3 text-sm text-muted-foreground">{note}</p>
      <div className="mt-6 flex items-baseline gap-2 border-t border-beige pt-6">
        <span className="font-serif text-3xl text-navy">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function ServicesPage() {
  const { t } = useTranslation();
  const c = usePageContent("services");
  return (
    <SiteLayout>
      <PageHero
        eyebrow="04 — Services"
        title={t("sections.servicesTitle")}
        subtitle={t("sections.servicesSub")}
        videoSrc="/media/services.mp4"
      />

      {/* Трансфер */}
      {!c.hidden("transfer") && (
        <section className="bg-cream py-24 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow>{c.text("transfer.eyebrow", "Услуги")}</Eyebrow>
              <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">{c.text("transfer.title", "Трансфер")}</h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                {c.text("transfer.desc", "Встретим в аэропорту Елизово (PKC) и доставим в отель — и обратно. Закажите трансфер заранее при бронировании.")}
              </p>
            </div>
            <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
              <InfoCard bg="bg-background" title={c.text("transfer.car.title", "Легковой автомобиль")} note={c.text("transfer.car.note", "Аэропорт Елизово ↔ отель, до 3 пассажиров")} value={c.text("transfer.car.price", "1 500 ₽")} unit={c.text("transfer.car.unit", "/ поездка")} />
              <InfoCard bg="bg-background" title={c.text("transfer.bus.title", "Микроавтобус")} note={c.text("transfer.bus.note", "Аэропорт Елизово ↔ отель, для группы")} value={c.text("transfer.bus.price", "2 000 ₽")} unit={c.text("transfer.bus.unit", "/ поездка")} />
            </div>
          </div>
        </section>
      )}

      {/* Ранний заезд / поздний выезд */}
      {!c.hidden("earlylate") && (
        <section className="bg-background py-24 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow>{c.text("earlylate.eyebrow", "Услуги")}</Eyebrow>
              <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">{c.text("earlylate.title", "Ранний заезд и поздний выезд")}</h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                {c.text("earlylate.desc", "Расчётный час: заезд с 14:00, выезд до 12:00. Нужно раньше или позже — доплата 50 % стоимости за ночь. Уточните возможность при бронировании.")}
              </p>
            </div>
            <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
              <InfoCard bg="bg-cream" title={c.text("earlylate.early.title", "Ранний заезд")} note={c.text("earlylate.early.note", "Заселение до 14:00")} value={c.text("earlylate.early.value", "50 %")} unit={c.text("earlylate.early.unit", "от стоимости за ночь")} />
              <InfoCard bg="bg-cream" title={c.text("earlylate.late.title", "Поздний выезд")} note={c.text("earlylate.late.note", "Выезд после 12:00")} value={c.text("earlylate.late.value", "50 %")} unit={c.text("earlylate.late.unit", "от стоимости за ночь")} />
            </div>
          </div>
        </section>
      )}

      {/* Завтрак */}
      {!c.hidden("breakfast") && (
        <section className="bg-cream py-24 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <PhotoGallery photos={c.images("breakfast.photos", BREAKFAST_DEF)} alt="Завтрак в отеле «Полуостров»" />
              <div>
                <Eyebrow>{c.text("breakfast.eyebrow", "Гастрономия")}</Eyebrow>
                <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">{c.text("breakfast.title", "Завтрак")}</h2>
                <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                  {c.text("breakfast.desc", "Комплексный завтрак по предварительному заказу — приготовлен из локальных продуктов и подаётся в нашем ресторане.")}
                </p>
                <Price value={c.text("breakfast.price", "450 ₽")} unit={c.text("breakfast.unit", "/ гость в сутки")} />
                <p className="mt-6 text-xs tracking-widest-plus uppercase text-muted-foreground">
                  {c.text("breakfast.note", "Заказ принимается до 20:00 предыдущего дня")}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Обед */}
      {!c.hidden("lunch") && (
        <section className="bg-background py-24 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="lg:order-2">
                <PhotoGallery photos={c.images("lunch.photos", DISHES_DEF)} alt="Блюда кухни отеля «Полуостров»" />
              </div>
              <div className="lg:order-1">
                <Eyebrow>{c.text("lunch.eyebrow", "Гастрономия")}</Eyebrow>
                <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">{c.text("lunch.title", "Обед")}</h2>
                <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                  {c.text("lunch.desc", "Комплексный обед из локальных продуктов — по предварительному заказу.")}
                </p>
                <Price value={c.text("lunch.price", "850 ₽")} unit={c.text("lunch.unit", "/ гость в сутки")} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Ужин */}
      {!c.hidden("dinner") && (
        <section className="bg-cream py-24 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <PhotoGallery photos={c.images("dinner.photos", DINNER_DEF)} alt="Ужин в отеле «Полуостров»" />
              <div>
                <Eyebrow>{c.text("dinner.eyebrow", "Гастрономия")}</Eyebrow>
                <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">{c.text("dinner.title", "Ужин")}</h2>
                <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                  {c.text("dinner.desc", "Комплексный ужин по предварительному заказу — салат, горячее блюдо, гарнир и домашний напиток.")}
                </p>
                <Price value={c.text("dinner.price", "850 ₽")} unit={c.text("dinner.unit", "/ гость в сутки")} />
                <p className="mt-6 text-xs tracking-widest-plus uppercase text-muted-foreground">
                  {c.text("dinner.note", "Заказ принимается до 14:00 в день подачи")}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Пакеты питания */}
      {!c.hidden("packages") && (
        <section className="bg-background py-24 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow>{c.text("packages.eyebrow", "Питание")}</Eyebrow>
              <h2 className="mt-5 font-serif text-4xl text-navy sm:text-5xl">{c.text("packages.title", "Пакеты питания")}</h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                {c.text("packages.desc", "Закажите питание на весь срок проживания — выгоднее, чем по отдельности.")}
              </p>
            </div>
            <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
              <InfoCard bg="bg-cream" title={c.text("packages.half.title", "Полупансион")} note={c.text("packages.half.note", "Завтрак и ужин")} value={c.text("packages.half.price", "1 200 ₽")} unit={c.text("packages.half.unit", "/ гость в сутки")} />
              <InfoCard bg="bg-cream" title={c.text("packages.full.title", "Полный пансион")} note={c.text("packages.full.note", "Завтрак, обед и ужин")} value={c.text("packages.full.price", "1 900 ₽")} unit={c.text("packages.full.unit", "/ гость в сутки")} />
            </div>
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
