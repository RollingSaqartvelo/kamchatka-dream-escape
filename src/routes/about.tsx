import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";
import { usePageContent } from "@/lib/site-content";
import { ABOUT_INTRO_DEF, ABOUT_HOWTO_DEF, ABOUT_BULLETS_DEF, ABOUT_ROOMS_DEF } from "@/lib/content-registry";

// Разбить многострочный текст на непустые строки.
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

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
  const c = usePageContent("about");
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About"
        title={t("sections.aboutTitle")}
        subtitle={t("sections.aboutText")}
        videoSrc="/media/about.mp4"
      />
      {!c.hidden("intro") && (
        <section className="bg-background py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-[11px] uppercase tracking-[4px] text-gold">
              {c.text("intro.eyebrow", "Полуостров")}
            </p>
            <h2 className="mt-4 text-center font-serif text-3xl text-navy sm:text-4xl">
              {c.text("intro.title", "Уютный мини-отель в сердце Камчатки")}
            </h2>
            <div className="mt-10 space-y-6 text-base leading-relaxed text-muted-foreground">
              {c.text("intro.body", ABOUT_INTRO_DEF)
                .split(/\n\n+/)
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
            </div>
          </div>
        </section>
      )}

      {!c.hidden("conditions") && (
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[11px] uppercase tracking-[4px] text-gold">
            {c.text("conditions.eyebrow", "Условия проживания")}
          </p>
          <h2 className="mt-4 text-center font-serif text-3xl text-navy sm:text-4xl">
            {c.text("conditions.title", "Мини-отель «Полуостров»")}
          </h2>

          <div className="mt-14">
            <h3 className="font-serif text-2xl text-navy">{c.text("conditions.roomFundTitle", "Номерной фонд")}</h3>
            <div className="mt-6 overflow-hidden border border-beige bg-background">
              <table className="w-full text-left text-sm">
                <thead className="bg-beige/40">
                  <tr>
                    <th className="px-6 py-4 text-[11px] uppercase tracking-[2px] text-navy">
                      Тип
                    </th>
                    <th className="px-6 py-4 text-[11px] uppercase tracking-[2px] text-navy">
                      Описание
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige">
                  {c.list("conditions.rooms", ABOUT_ROOMS_DEF).map((r, i) => (
                    <tr key={i}>
                      <td className="px-6 py-5 font-serif text-base text-navy">{r.type}</td>
                      <td className="px-6 py-5 text-muted-foreground">{r.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <div className="border border-beige bg-background p-8">
              <h3 className="font-serif text-2xl text-navy">{c.text("conditions.checkinTitle", "Время заезда и выезда")}</h3>
              <ul className="mt-6 space-y-3 text-muted-foreground">
                {lines(c.text("conditions.checkin", "Заезд — с 14:00\nВыезд — до 12:00")).map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-muted-foreground">
                {c.text("conditions.checkinNote", "Ранний заезд и поздний выезд — по запросу и при наличии свободных номеров.")}
              </p>
            </div>

            <div className="border border-beige bg-background p-8">
              <h3 className="font-serif text-2xl text-navy">{c.text("conditions.cancelTitle", "Отмена бронирования")}</h3>
              <ul className="mt-6 space-y-3 text-muted-foreground">
                {lines(c.text("conditions.cancel", "Бесплатная отмена — за 14 дней и более до даты заезда\nПри отмене менее чем за 14 дней — применяются штрафные санкции")).map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-14">
            <h3 className="font-serif text-2xl text-navy">{c.text("conditions.howtoTitle", "Как забронировать")}</h3>
            <ol className="mt-6 space-y-4">
              {lines(c.text("conditions.howto", ABOUT_HOWTO_DEF)).map((step, i) => (
                <li
                  key={i}
                  className="flex gap-5 border-b border-beige pb-4 last:border-b-0"
                >
                  <span className="font-serif text-xl text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-14 text-center font-serif text-xl text-navy">
            {c.text("conditions.footer", "Ждём вас в мини-отеле «Полуостров»")}
          </p>
        </div>
      </section>
      )}

      {!c.hidden("cta") && (
      <section className="bg-navy py-24 text-cream">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[11px] uppercase tracking-[4px] text-gold">
            {c.text("cta.eyebrow", "Тихая гавань")}
          </p>
          <h2 className="mt-4 text-center font-serif text-3xl text-cream sm:text-4xl">
            {c.text("cta.title", "Ищете спокойное место для отдыха на Камчатке?")}
          </h2>

          <p className="mt-8 text-center text-cream/80">
            {c.text("cta.lead", "«Полуостров» — небольшой отель, где всё создано для тихого и комфортного проживания.")}
          </p>

          <ul className="mx-auto mt-10 max-w-xl space-y-4 text-cream/85">
            {lines(c.text("cta.bullets", ABOUT_BULLETS_DEF)).map((b, i) => (
              <li key={i} className="flex gap-4 border-b border-cream/15 pb-4 last:border-b-0">
                <span className="font-serif text-base text-gold">{String(i + 1).padStart(2, "0")}</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <p className="mx-auto mt-12 max-w-2xl text-center text-cream/75">
            {c.text("cta.body", "Многие гости приезжают к нам после поездок по Камчатке — чтобы отдохнуть пару дней, восстановиться и набраться сил перед дорогой домой.")}
          </p>

          <div className="mt-14 border-t border-cream/15 pt-12 text-center">
            <p className="text-[11px] uppercase tracking-[4px] text-gold">
              {c.text("cta.ctaEyebrow", "Готовы приехать?")}
            </p>
            <p className="mx-auto mt-4 max-w-xl text-cream/80">
              {c.text("cta.ctaBody", "Забронируйте номер прямо на сайте — выберите даты, формат размещения и подтвердите бронирование за пару минут.")}
            </p>
            <a
              href="/booking"
              className="mt-8 inline-block border border-gold bg-gold px-10 py-4 text-[11px] uppercase tracking-[3px] text-navy transition-colors hover:bg-transparent hover:text-gold"
            >
              {c.text("cta.button", "Забронировать на сайте")}
            </a>
            <p className="mt-12 font-serif text-2xl text-cream">
              {c.text("cta.closing", "Полуостров — место, куда хочется возвращаться")}
            </p>
          </div>
        </div>
      </section>
      )}
    </SiteLayout>
  );
}
