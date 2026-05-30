import { useEffect, useRef, useState } from "react";

export function PageHero({
  eyebrow,
  title,
  subtitle,
  videoSrc = "/media/hero.mp4",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  videoSrc?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [muted, setMuted] = useState(true);
  const [srcLoaded, setSrcLoaded] = useState(false);

  // Загружаем видео только когда секция входит в viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSrcLoaded(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Автозапуск после загрузки src
  useEffect(() => {
    if (srcLoaded && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [srcLoaded]);

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    if (!next) v.play().catch(() => {});
    setMuted(next);
  };

  return (
    <section ref={sectionRef} className="relative h-[70vh] min-h-[460px] w-full overflow-hidden bg-navy">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={srcLoaded ? videoSrc : undefined}
        muted
        loop
        playsInline
        preload="none"
      />

      <button
        type="button"
        onClick={toggleSound}
        aria-label={muted ? "Включить звук" : "Выключить звук"}
        aria-pressed={!muted}
        className="absolute right-5 top-5 z-20 inline-flex items-center gap-2 bg-navy/60 px-4 py-2 text-[10px] tracking-widest-plus uppercase text-cream backdrop-blur-sm transition hover:bg-navy/80"
        style={{ borderRadius: "2px" }}
      >
        <span aria-hidden className="text-base leading-none">
          {muted ? "🔇" : "🔊"}
        </span>
        <span>Динамика</span>
      </button>

      <div className="relative z-10 flex h-full items-end pb-16 sm:pb-20">
        <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          {eyebrow && (
            <p className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold">
              {eyebrow}
            </p>
          )}
          <h1 className="font-serif text-5xl text-cream sm:text-6xl">{title}</h1>
          {subtitle && (
            <p className="mt-6 text-base text-cream/80 sm:text-lg">{subtitle}</p>
          )}
        </div>
      </div>
    </section>
  );
}
