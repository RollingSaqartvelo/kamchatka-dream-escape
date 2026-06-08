import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { CreditCard, Smartphone, FileText, ShieldCheck } from "lucide-react";
import { getPublicBooking, createAlfaPayment } from "@/lib/payment.functions";
import { dfLocale } from "@/components/booking/Step1Dates";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  e: z.string().optional(),
  failed: z.string().optional(),
});

export const Route = createFileRoute("/booking_/pay/$id")({
  validateSearch: searchSchema,
  component: PayPage,
  head: () => ({
    meta: [
      { title: "Оплата бронирования — Полуостров" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Booking = Awaited<ReturnType<typeof getPublicBooking>>;
type Method = "card" | "sbp" | "invoice";

const METHODS: Array<{
  id: Method;
  titleKey: string;
  subKey: string;
  icon: React.ReactNode;
}> = [
  {
    id: "card",
    titleKey: "booking.pay.methodCard",
    subKey: "booking.pay.methodCardSub",
    icon: <CreditCard className="h-5 w-5 text-[#C9A96E]" strokeWidth={1.5} />,
  },
  {
    id: "sbp",
    titleKey: "booking.pay.methodSbp",
    subKey: "booking.pay.methodSbpSub",
    icon: <Smartphone className="h-5 w-5 text-[#C9A96E]" strokeWidth={1.5} />,
  },
  {
    id: "invoice",
    titleKey: "booking.pay.methodInvoice",
    subKey: "booking.pay.methodInvoiceSub",
    icon: <FileText className="h-5 w-5 text-[#C9A96E]" strokeWidth={1.5} />,
  },
];

function fmtRub(n: number) {
  return "₽ " + new Intl.NumberFormat("ru-RU").format(n);
}

// Статический СБП-QR Альфы (любая сумма) — временный приём оплаты, пока
// не активирован API-пользователь для register.do.
const SBP_QR_URL =
  "https://qr.nspk.ru/AS1A0068736SLJ8K8S0BN9DDPGRSHT36?type=01&bank=100000000008&crc=F179";

function PayPage() {
  const { t, i18n } = useTranslation();
  const loc = dfLocale(i18n.language);
  const { id } = Route.useParams();
  const { e: emailFromUrl, failed } = Route.useSearch();
  const navigate = useNavigate();

  const fetchBooking = useServerFn(getPublicBooking);
  const startPayment = useServerFn(createAlfaPayment);

  const [emailInput, setEmailInput] = useState(emailFromUrl ?? "");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("card");
  const [paying, setPaying] = useState(false);
  const [showSbpQr, setShowSbpQr] = useState(false);

  async function load(email: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBooking({ data: { id, email: email.trim() } });
      setBooking(data);
    } catch (err) {
      console.error(err);
      setError(t("booking.pay.errorNotFound"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (emailFromUrl) load(emailFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paymentsOff = !!booking && (booking as { payments_enabled?: boolean }).payments_enabled === false;

  async function pay() {
    if (!booking) return;
    if (paymentsOff) return;
    setError(null);
    // СБП — временно через статический QR (без API). Просто показываем QR.
    if (method === "sbp") {
      setShowSbpQr(true);
      return;
    }
    setPaying(true);
    try {
      const result = await startPayment({
        data: { booking_id: booking.id, email: booking.email, method },
      });
      // Внешний URL Альфы или внутренний redirect (mock / invoice)
      if (result.paymentUrl.startsWith("http")) {
        window.location.href = result.paymentUrl;
      } else {
        navigate({ to: result.paymentUrl });
      }
    } catch (err) {
      console.error(err);
      setError(t("booking.pay.errorPay"));
      setPaying(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f2ee] py-12 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Link to="/" className="font-serif text-xl text-navy">
          Полуостров
        </Link>
        <p className="mt-1 text-[10px] uppercase tracking-[3px] text-muted-foreground">
          {t("booking.pay.title")}
        </p>

        {failed && (
          <div className="mt-6 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {t("booking.pay.failed")}
          </div>
        )}

        {/* Email gate */}
        {!booking && (
          <div className="mt-10 border border-border bg-background p-8">
            <h1 className="font-serif text-3xl text-navy">{t("booking.pay.gateTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("booking.pay.gateText")}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                load(emailInput);
              }}
              className="mt-6 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[#C9A96E]"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-[#1a1a1a] px-8 py-3 text-[11px] uppercase tracking-[2px] text-white hover:bg-[#C9A96E] disabled:opacity-50"
              >
                {loading ? t("booking.pay.loading") : t("booking.pay.continueBtn")}
              </button>
            </form>
            {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
          </div>
        )}

        {/* Already paid */}
        {booking && booking.payment_status === "paid" && (
          <div className="mt-10 border border-emerald-200 bg-emerald-50 p-8">
            <p className="text-[10px] uppercase tracking-[3px] text-emerald-700">
              {t("booking.pay.bookingNo", { n: booking.booking_number })}
            </p>
            <h1 className="mt-2 font-serif text-3xl text-emerald-900">
              {t("booking.pay.paidTitle")}
            </h1>
            <p className="mt-3 text-sm text-emerald-900/80">
              {t("booking.pay.paidText", {
                email: booking.email,
                date: format(parseISO(booking.check_in), "d MMMM yyyy", { locale: loc }),
              })}
            </p>
          </div>
        )}

        {/* Оплата временно отключена — технические работы */}
        {booking && booking.payment_status !== "paid" && paymentsOff && (
          <div className="mt-10 border border-amber-300 bg-amber-50 p-8 text-center">
            <p className="text-[10px] uppercase tracking-[3px] text-amber-700">
              {t("booking.pay.bookingNo", { n: booking.booking_number })}
            </p>
            <h1 className="mt-2 font-serif text-3xl text-navy">Оплата временно недоступна</h1>
            <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
              На сайте ведутся технические работы — онлайн-оплата временно отключена.
              Ваша бронь сохранена. Для оплаты и подтверждения свяжитесь с нами:
            </p>
            <p className="mt-4 font-serif text-xl text-navy">
              <a href="tel:+79149945757" className="hover:text-[#C9A96E]">+7 (914) 994-57-57</a>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              <a href="mailto:poluostrovkam@mail.ru" className="hover:text-[#C9A96E]">poluostrovkam@mail.ru</a>
            </p>
          </div>
        )}

        {/* Payment form */}
        {booking && booking.payment_status !== "paid" && !paymentsOff && (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="border border-border bg-background p-8">
              <p className="text-[10px] uppercase tracking-[3px] text-[#C9A96E]">
                {t("booking.pay.bookingNo", { n: booking.booking_number })}
              </p>
              <h1 className="mt-2 font-serif text-3xl text-navy">
                {t("booking.pay.choose")}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("booking.pay.prepayText1")}
                <span className="text-navy">{fmtRub(booking.prepayment_amount)}</span>
                {t("booking.pay.prepayText2")}
                <span className="text-navy">{fmtRub(booking.remaining_amount)}</span>
                {t("booking.pay.prepayText3")}
              </p>

              <div className="mt-8 grid gap-3">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMethod(m.id);
                      setShowSbpQr(false);
                    }}
                    className={cn(
                      "flex items-center gap-4 border bg-card p-5 text-left transition-colors",
                      method === m.id
                        ? "border-[#C9A96E] ring-1 ring-[#C9A96E]"
                        : "border-border hover:border-[#C9A96E]",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-background">
                      {m.icon}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-navy">{t(m.titleKey)}</p>
                      <p className="text-xs text-muted-foreground">{t(m.subKey)}</p>
                    </div>
                    <span
                      className={cn(
                        "h-4 w-4 rounded-full border",
                        method === m.id
                          ? "border-[#C9A96E] bg-[#C9A96E]"
                          : "border-border",
                      )}
                    />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={pay}
                disabled={paying}
                className="mt-8 w-full bg-[#1a1a1a] py-4 text-[11px] uppercase tracking-[2px] text-white hover:bg-[#C9A96E] disabled:opacity-50"
              >
                {paying
                  ? t("booking.pay.paying")
                  : method === "invoice"
                    ? t("booking.pay.requestInvoice")
                    : method === "sbp"
                      ? "Показать QR для оплаты по СБП"
                      : t("booking.pay.payBtn", { amount: fmtRub(booking.prepayment_amount) })}
              </button>

              {/* СБП-QR (временный приём оплаты) */}
              {method === "sbp" && showSbpQr && (
                <div className="mt-6 border border-[#C9A96E] bg-cream/40 p-6 text-center">
                  <p className="text-sm text-navy">
                    Отсканируйте QR-код в приложении вашего банка (через СБП)
                  </p>
                  <img
                    src="/sbp-qr.svg"
                    alt="СБП QR-код для оплаты"
                    className="mx-auto my-4 h-56 w-56"
                  />
                  <p className="text-sm text-navy">
                    Сумма к оплате:{" "}
                    <b className="text-base">{fmtRub(booking.prepayment_amount)}</b>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    В комментарии к платежу укажите номер брони:{" "}
                    <b className="text-navy">№ {booking.booking_number}</b>
                  </p>
                  <a
                    href={SBP_QR_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block bg-[#1a1a1a] px-6 py-3 text-[11px] uppercase tracking-[2px] text-white hover:bg-[#C9A96E]"
                  >
                    Открыть в приложении банка
                  </a>
                  <p className="mt-4 text-xs text-muted-foreground">
                    После оплаты бронь подтвердит администратор. Чек придёт от банка.
                  </p>
                </div>
              )}

              <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                {t("booking.pay.secure")}
              </p>

              {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
            </div>

            {/* Summary */}
            <aside className="self-start border border-border bg-cream/50 p-6 lg:sticky lg:top-8">
              <p className="font-serif text-xl text-navy">{t("booking.pay.summaryTitle")}</p>
              <dl className="mt-4 space-y-3 text-sm">
                <Row label={t("booking.pay.guest")}>
                  {booking.last_name} {booking.first_name}
                </Row>
                <Row label={t("booking.pay.room")}>{booking.room_name}</Row>
                <Row label={t("booking.pay.checkIn")}>
                  {format(parseISO(booking.check_in), "d MMM yyyy", { locale: loc })}
                </Row>
                <Row label={t("booking.pay.checkOut")}>
                  {format(parseISO(booking.check_out), "d MMM yyyy", { locale: loc })}
                </Row>
                <Row label={t("booking.pay.nights")}>{booking.nights}</Row>
                <Row label={t("booking.pay.guests")}>
                  {t("booking.pay.adultsShort", { n: booking.adults })}
                  {booking.children > 0 && t("booking.pay.childrenShort", { n: booking.children })}
                </Row>
              </dl>

              <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("booking.pay.totalStay")}</span>
                  <span>{fmtRub(booking.total_price)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("booking.pay.remaining")}</span>
                  <span>{fmtRub(booking.remaining_amount)}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3 text-navy">
                  <span className="text-[11px] uppercase tracking-widest">
                    {t("booking.pay.payNow")}
                  </span>
                  <span className="font-serif text-2xl">
                    {fmtRub(booking.prepayment_amount)}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-navy">{children}</dd>
    </div>
  );
}
