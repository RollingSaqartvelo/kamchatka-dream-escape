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
  return (
    <section className="relative h-[70vh] min-h-[460px] w-full overflow-hidden bg-navy">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 bg-gradient-to-b from-navy/50 via-navy/30 to-navy/80" />
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
