import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import r1 from "@/assets/reviews/review_1_sharavin.png";
import r2 from "@/assets/reviews/review_2_osadchy.png";
import r3 from "@/assets/reviews/review_3_ekaterina.png";
import r4 from "@/assets/reviews/review_4_anna_baykala.png";
import r5 from "@/assets/reviews/review_5_raisa.png";
import r6 from "@/assets/reviews/review_6_semen.png";

const reviews = [
  { src: r1, alt: "Отзыв Александра Шаравина" },
  { src: r2, alt: "Отзыв Александра Осадчего" },
  { src: r3, alt: "Отзыв Ekaterina4500" },
  { src: r4, alt: "Отзыв Анны, Лик Байкала" },
  { src: r5, alt: "Отзыв Raisa Belozerova" },
  { src: r6, alt: "Отзыв Семёна Корецкого" },
];

const groups = [reviews.slice(0, 3), reviews.slice(3, 6)];

export function ReviewsBlock() {
  const [group, setGroup] = useState(0);
  const [mobileIdx, setMobileIdx] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [modal, setModal] = useState<{ src: string; alt: string } | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setModal(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  const current = groups[group];

  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      setMobileIdx((i) =>
        diff > 0 ? Math.min(reviews.length - 1, i + 1) : Math.max(0, i - 1),
      );
    }
    setTouchStart(null);
  };

  return (
    <section className="bg-[#111111] py-24 sm:py-32" aria-label="Отзывы гостей">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-5 text-[11px] uppercase text-white/50" style={{ letterSpacing: "3px" }}>
            Отзывы гостей
          </p>
          <h2 className="font-serif text-white" style={{ fontSize: "42px", lineHeight: 1.1 }}>
            Нам доверяют
          </h2>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm sm:text-base" style={{ color: "#C9A96E" }}>
            <span>4.8 ★</span>
            <span className="opacity-40">|</span>
            <span>600+ отзывов</span>
            <span className="opacity-40">|</span>
            <span>Яндекс + 2ГИС + Google.Maps</span>
          </div>
        </div>

        {/* Desktop */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setGroup((g) => (g - 1 + groups.length) % groups.length)}
            aria-label="Предыдущие отзывы"
            className="group absolute -left-2 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border transition-colors hover:bg-[#C9A96E] lg:-left-6"
            style={{ borderColor: "#C9A96E" }}
          >
            <ChevronLeft className="h-5 w-5 transition-colors group-hover:text-black" style={{ color: "#C9A96E" }} />
          </button>
          <button
            onClick={() => setGroup((g) => (g + 1) % groups.length)}
            aria-label="Следующие отзывы"
            className="group absolute -right-2 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border transition-colors hover:bg-[#C9A96E] lg:-right-6"
            style={{ borderColor: "#C9A96E" }}
          >
            <ChevronRight className="h-5 w-5 transition-colors group-hover:text-black" style={{ color: "#C9A96E" }} />
          </button>

          <div
            key={group}
            className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-right-4 duration-[400ms]"
          >
            {current.map((rv, i) => {
              const dim = hovered !== null && hovered !== i;
              const isHover = hovered === i;
              return (
                <button
                  key={rv.src}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setModal(rv)}
                  className="relative overflow-hidden bg-white text-left transition-all duration-300"
                  style={{
                    borderRadius: "16px",
                    boxShadow: isHover
                      ? "0 16px 48px rgba(201,169,110,0.35)"
                      : "0 4px 20px rgba(0,0,0,0.25)",
                    transform: isHover ? "scale(1.06)" : "scale(1)",
                    border: isHover ? "2px solid #C9A96E" : "2px solid transparent",
                    opacity: dim ? 0.7 : 1,
                    zIndex: isHover ? 10 : 1,
                  }}
                >
                  <img src={rv.src} alt={rv.alt} className="block h-auto w-full" loading="lazy" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <div
            className="overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="flex transition-transform duration-400 ease-out"
              style={{ transform: `translateX(-${mobileIdx * 100}%)` }}
            >
              {reviews.map((rv) => (
                <div key={rv.src} className="w-full flex-shrink-0 px-2">
                  <button
                    onClick={() => setModal(rv)}
                    className="block w-full overflow-hidden bg-white"
                    style={{ borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}
                  >
                    <img src={rv.src} alt={rv.alt} className="block h-auto w-full" loading="lazy" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex justify-center gap-2">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setMobileIdx(i)}
                aria-label={`Отзыв ${i + 1}`}
                className="h-2 rounded-full transition-all"
                style={{
                  width: i === mobileIdx ? "20px" : "8px",
                  backgroundColor: i === mobileIdx ? "#C9A96E" : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={() => setModal(null)}
        >
          <div
            className="relative w-full"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModal(null)}
              aria-label="Закрыть"
              className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={modal.src}
              alt={modal.alt}
              className="block h-auto w-full bg-white"
              style={{ borderRadius: "16px" }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
