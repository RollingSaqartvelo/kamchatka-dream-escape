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
    </SiteLayout>
  );
}
