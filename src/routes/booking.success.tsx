import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { z } from "zod";
import { SiteLayout } from "@/components/layout/SiteLayout";

const searchSchema = z.object({
  n: z.string().optional(),
  e: z.string().optional(),
});

export const Route = createFileRoute("/booking/success")({
  validateSearch: searchSchema,
  component: SuccessPage,
  head: () => ({
    meta: [
      { title: "Бронирование подтверждено — «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SuccessPage() {
  const { n, e } = Route.useSearch();
  return (
    <SiteLayout>
      <section className="bg-[#f5f2ee] py-24 sm:py-32">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <p className="font-serif text-2xl tracking-tight text-navy">Полуостров</p>

          <div className="mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#C9A96E] text-[#C9A96E]">
            <Check className="h-8 w-8" strokeWidth={2} />
          </div>

          <h1 className="mt-8 font-serif text-4xl text-navy sm:text-5xl">
            Бронирование подтверждено
          </h1>

          {n && (
            <p className="mt-6 text-[11px] uppercase tracking-[3px] text-muted-foreground">
              Номер брони
            </p>
          )}
          {n && <p className="font-serif text-3xl text-navy">#{n}</p>}

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            {e ? (
              <>
                Подтверждение отправлено на <span className="text-navy">{e}</span>.
                <br />
              </>
            ) : null}
            Наш менеджер свяжется с вами в течение часа для уточнения деталей и оплаты.
          </p>

          <Link
            to="/"
            className="mt-12 inline-block bg-[#1a1a1a] px-10 py-4 text-[11px] uppercase tracking-[2px] text-white transition-colors hover:bg-[#C9A96E]"
          >
            На главную
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
