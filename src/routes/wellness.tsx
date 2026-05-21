import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ImageIcon, Thermometer, MapPin } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";
import essovskieImg from "@/assets/springs/essovskie.webp";
import hodutkinskieImg from "@/assets/springs/hodutkinskie.webp";

export const Route = createFileRoute("/wellness")({
  component: WellnessPage,
  head: () => ({
    meta: [
      { title: "Оздоровление — Отель «Полуостров»" },
      { name: "description", content: "Термальные источники Камчатки: Паратунка, Карымшино, Налычево, Малки и другие." },
    ],
  }),
});

type Spring = {
  name: string;
  distance: string;
  temp: string;
  description: string;
  image?: string;
};

const springs: Spring[] = [
  {
    name: "Нижне-Паратунские источники",
    distance: "50 км от Петропавловска-Камчатского",
    temp: "около 38 °C",
    description:
      "Идеальная температура для комфортного купания. Насыщенная минералами вода восстанавливает силы и улучшает общее самочувствие.",
  },
  {
    name: "Карымшинские источники",
    distance: "Долина реки Карымшино",
    temp: "от 40 до 75 °C",
    description:
      "Кристально чистая вода и уединённая атмосфера живописной долины создают идеальные условия для глубокой релаксации и оздоровления.",
  },
  {
    name: "Зеленовские озерки",
    distance: "Природный комплекс",
    temp: "горячие и прохладные купели",
    description:
      "Высокое содержание сероводорода и радона. Контрастное купание тонизирует сосуды и придаёт лёгкость телу.",
  },
  {
    name: "Налычевская долина",
    distance: "60 км от Петропавловска-Камчатского",
    temp: "от 14 до 75 °C",
    description:
      "Около 50 выходов термальных вод с уникальным минеральным составом. Благотворно влияет на сердечно-сосудистую, нервную и мышечную системы.",
  },
  {
    name: "Малкинские источники",
    distance: "125 км от Петропавловска-Камчатского",
    temp: "35–45 °C",
    description:
      "Слабоминерализованная вода в окружении первозданной природы помогает по-настоящему расслабиться и восстановить силы.",
  },
  {
    name: "Ходуткинские источники",
    distance: "Юг полуострова",
    temp: "38–40 °C",
    description:
      "Уникальное место, где горячая вода формирует целую реку. Купание среди вулканических пейзажей — опыт, который остаётся с вами навсегда.",
  },
  {
    name: "Эссовские источники",
    distance: "Уединённая долина",
    temp: "от 40 до 70 °C",
    description:
      "Слабоминерализованная вода восстанавливает силы и благотворно влияет на дыхательную систему. Тишина и горный воздух дополняют эффект.",
    image: essovskieImg,
  },
];

function WellnessPage() {
  const { t } = useTranslation();
  return (
    <SiteLayout>
      <PageHero
        eyebrow="02 — Wellness"
        title={t("sections.wellnessTitle")}
        subtitle={t("sections.wellnessSub")}
        videoSrc="/media/wellness.mp4"
      />

      <section className="bg-background py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-[11px] tracking-widest-plus uppercase text-gold">Термальная Камчатка</p>
          <h2 className="mt-4 font-serif text-4xl text-navy md:text-5xl">
            Источники силы полуострова
          </h2>
          <div className="mx-auto mt-6 h-px w-16 bg-gold" />
          <p className="mt-8 leading-relaxed text-muted-foreground">
            Камчатка славится многочисленными термальными источниками — каждый со своим
            характером, температурой и минеральным составом. Мы собрали самые значимые
            места, куда стоит отправиться ради настоящего оздоровления и единения с природой.
          </p>
        </div>
      </section>

      <section className="bg-[#f9f7f4] py-20">
        <div className="mx-auto max-w-7xl space-y-20 px-4 sm:px-6 lg:px-8">
          {springs.map((spring, idx) => {
            const reversed = idx % 2 === 1;
            return (
              <article
                key={spring.name}
                className="grid items-center gap-10 lg:grid-cols-2"
              >
                <div
                  className={`flex aspect-[4/3] w-full items-center justify-center overflow-hidden border border-gold/30 bg-beige/40 ${
                    reversed ? "lg:order-2" : ""
                  }`}
                >
                  {spring.image ? (
                    <img
                      src={spring.image}
                      alt={spring.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-gold/70">
                      <ImageIcon className="h-12 w-12" strokeWidth={1} />
                      <span className="text-[10px] tracking-widest-plus uppercase">
                        Фото скоро
                      </span>
                    </div>
                  )}
                </div>

                <div className={reversed ? "lg:order-1" : ""}>
                  <p className="text-[10px] tracking-widest-plus uppercase text-gold">
                    {String(idx + 1).padStart(2, "0")} — Источник
                  </p>
                  <h3 className="mt-3 font-serif text-3xl text-navy md:text-4xl">
                    {spring.name}
                  </h3>
                  <div className="mt-5 h-px w-12 bg-gold" />

                  <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm text-navy/80">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gold" />
                      {spring.distance}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-gold" />
                      {spring.temp}
                    </span>
                  </div>

                  <p className="mt-6 leading-relaxed text-muted-foreground">
                    {spring.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-background py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-serif text-2xl leading-relaxed text-navy md:text-3xl">
            Каждый источник — это своя атмосфера и своя сила. Вместе они делают
            путешествие на Камчатку по-настоящему незабываемым.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
