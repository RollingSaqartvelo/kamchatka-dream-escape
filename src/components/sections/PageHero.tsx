export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="bg-cream pb-16 pt-40">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {eyebrow && (
          <p className="mb-5 text-[11px] tracking-widest-plus uppercase text-gold">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-5xl text-navy sm:text-6xl">{title}</h1>
        {subtitle && (
          <p className="mt-6 text-base text-muted-foreground sm:text-lg">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
