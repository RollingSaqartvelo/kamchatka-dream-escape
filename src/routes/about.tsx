import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";

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
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About"
        title={t("sections.aboutTitle")}
        subtitle={t("sections.aboutText")}
        videoSrc="/media/about.mp4"
      />
      <section className="bg-background py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[11px] uppercase tracking-[4px] text-gold">
            Полуостров
          </p>
          <h2 className="mt-4 text-center font-serif text-3xl text-navy sm:text-4xl">
            Уютный мини-отель в сердце Камчатки
          </h2>
          <div className="mt-10 space-y-6 text-base leading-relaxed text-muted-foreground">
            <p>
              Новый уютный мини-отель «Полуостров» предлагает гостям и жителям города
              комфортное проживание со всеми удобствами и собственным рестораном.
            </p>
            <p>
              В отеле имеются <span className="text-navy">9 стандартных номеров</span>,
              оснащённых согласно современному сервису: каждый оборудован санузлом с душем,
              телевизором с плоским экраном, холодильником, сейфом, чайником и банными
              принадлежностями, а также{" "}
              <span className="text-navy">4 комнаты многоместного проживания</span> с
              общими кухонной и зоной отдыха, душевыми и туалетными помещениями.
            </p>
            <p>
              Гости могут выбрать тип размещения согласно своим предпочтениям: как
              отдельные номера с двуспальной или двумя односпальными кроватями, так и
              места в хостеле.
            </p>
            <p>
              На всей территории гостиницы и в номерах имеется бесплатный доступ в
              интернет Wi-Fi. Также к услугам гостей бесплатная парковка, камера
              хранения, гладильная доска и утюг.
            </p>
            <p className="text-navy">
              Мы всегда рады приветствовать Вас и сделаем всё возможное, чтобы Ваше
              путешествие оставило самое яркое и приятное впечатление.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-cream py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[11px] uppercase tracking-[4px] text-gold">
            Условия проживания
          </p>
          <h2 className="mt-4 text-center font-serif text-3xl text-navy sm:text-4xl">
            Мини-отель «Полуостров»
          </h2>

          <div className="mt-14">
            <h3 className="font-serif text-2xl text-navy">Номерной фонд</h3>
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
                  <tr>
                    <td className="px-6 py-5 font-serif text-base text-navy">
                      Стандарт 2-местный
                    </td>
                    <td className="px-6 py-5 text-muted-foreground">
                      Уютный двухместный номер со всеми удобствами
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-5 font-serif text-base text-navy">
                      Комфорт 3-местный
                    </td>
                    <td className="px-6 py-5 text-muted-foreground">
                      Просторный трёхместный номер со всеми удобствами
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-5 font-serif text-base text-navy">
                      Койко-место
                    </td>
                    <td className="px-6 py-5 text-muted-foreground">
                      Комнаты с двухъярусными кроватями — отличный выбор для бюджетного
                      путешествия
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <div className="border border-beige bg-background p-8">
              <h3 className="font-serif text-2xl text-navy">Время заезда и выезда</h3>
              <ul className="mt-6 space-y-3 text-muted-foreground">
                <li>
                  <span className="text-navy">Заезд</span> — с 14:00
                </li>
                <li>
                  <span className="text-navy">Выезд</span> — до 12:00
                </li>
              </ul>
              <p className="mt-6 text-sm text-muted-foreground">
                Ранний заезд и поздний выезд — по запросу и при наличии свободных
                номеров.
              </p>
            </div>

            <div className="border border-beige bg-background p-8">
              <h3 className="font-serif text-2xl text-navy">Отмена бронирования</h3>
              <ul className="mt-6 space-y-3 text-muted-foreground">
                <li>
                  <span className="text-navy">Бесплатная отмена</span> — за 14 дней и
                  более до даты заезда
                </li>
                <li>
                  При отмене менее чем за 14 дней — применяются штрафные санкции
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14">
            <h3 className="font-serif text-2xl text-navy">Как забронировать</h3>
            <ol className="mt-6 space-y-4">
              {[
                "Перейдите на сайт и откройте форму бронирования",
                "Укажите даты заезда и выезда",
                "Выберите количество номеров и число проживающих",
                "Укажите предпочтения по размещению",
                "Подтвердите бронирование",
              ].map((step, i) => (
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
            Ждём вас в мини-отеле «Полуостров»
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
