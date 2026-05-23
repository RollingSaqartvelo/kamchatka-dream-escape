import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { CreditCard, Smartphone, Wallet, FileText, ShieldCheck } from "lucide-react";
import { getPublicBooking, createAlfaPayment } from "@/lib/payment.functions";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  e: z.string().optional(),
  failed: z.string().optional(),
});

export const Route = createFileRoute("/booking/pay/$id")({
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
type Method = "card" | "sbp" | "sberpay" | "invoice";

const METHODS: Array<{
  id: Method;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}> = [
  {
    id: "card",
    title: "Банковская карта",
    subtitle: "Visa · Mastercard · МИР",
    icon: <CreditCard className="h-5 w-5 text-[#C9A96E]" strokeWidth={1.5} />,
  },
  {
    id: "sbp",
    title: "СБП",
    subtitle: "Оплата по QR-коду из приложения банка",
    icon: <Smartphone className="h-5 w-5 text-[#C9A96E]" strokeWidth={1.5} />,
  },
  {
    id: "sberpay",
    title: "SberPay",
    subtitle: "Оплата через приложение СберБанк Онлайн",
    icon: <Wallet className="h-5 w-5 text-[#C9A96E]" strokeWidth={1.5} />,
  },
  {
    id: "invoice",
    title: "Оплата по счёту",
    subtitle: "Для юр. лиц и ИП. Реквизиты пришлём на email",
    icon: <FileText className="h-5 w-5 text-[#C9A96E]" strokeWidth={1.5} />,
  },
];

function fmtRub(n: number) {
  return "₽ " + new Intl.NumberFormat("ru-RU").format(n);
}

function PayPage() {
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

  async function load(email: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBooking({ data: { id, email: email.trim() } });
      setBooking(data);
    } catch (err) {
      console.error(err);
      setError("Бронь не найдена. Проверьте email.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (emailFromUrl) load(emailFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pay() {
    if (!booking) return;
    setPaying(true);
    setError(null);
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
      setError("Не удалось перейти к оплате. Попробуйте ещё раз.");
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
          Оплата бронирования
        </p>

        {failed && (
          <div className="mt-6 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Оплата не прошла. Попробуйте ещё раз или выберите другой способ.
          </div>
        )}

        {/* Email gate */}
        {!booking && (
          <div className="mt-10 border border-border bg-background p-8">
            <h1 className="font-serif text-3xl text-navy">Подтвердите email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Введите email, который вы указали при бронировании.
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
                {loading ? "Загрузка…" : "Продолжить"}
              </button>
            </form>
            {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
          </div>
        )}

        {/* Already paid */}
        {booking && booking.payment_status === "paid" && (
          <div className="mt-10 border border-emerald-200 bg-emerald-50 p-8">
            <p className="text-[10px] uppercase tracking-[3px] text-emerald-700">
              Бронь №{booking.booking_number}
            </p>
            <h1 className="mt-2 font-serif text-3xl text-emerald-900">
              Оплата уже получена
            </h1>
            <p className="mt-3 text-sm text-emerald-900/80">
              Спасибо! Подтверждение отправлено на {booking.email}. Ждём вас{" "}
              {format(parseISO(booking.check_in), "d MMMM yyyy", { locale: ru })}.
            </p>
          </div>
        )}

        {/* Payment form */}
        {booking && booking.payment_status !== "paid" && (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="border border-border bg-background p-8">
              <p className="text-[10px] uppercase tracking-[3px] text-[#C9A96E]">
                Бронь №{booking.booking_number}
              </p>
              <h1 className="mt-2 font-serif text-3xl text-navy">
                Выберите способ оплаты
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Чтобы закрепить номер, нужно внести предоплату{" "}
                <span className="text-navy">{fmtRub(booking.prepayment_amount)}</span>.
                Остаток <span className="text-navy">{fmtRub(booking.remaining_amount)}</span>{" "}
                оплачивается на ресепшн при заезде.
              </p>

              <div className="mt-8 grid gap-3">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
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
                      <p className="text-sm text-navy">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.subtitle}</p>
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
                  ? "Перенаправляем…"
                  : method === "invoice"
                    ? "Запросить счёт"
                    : `Оплатить ${fmtRub(booking.prepayment_amount)}`}
              </button>

              <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                Платёж защищён эквайрингом Альфа-Банка. Данные карты не сохраняются.
              </p>

              {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
            </div>

            {/* Summary */}
            <aside className="self-start border border-border bg-cream/50 p-6 lg:sticky lg:top-8">
              <p className="font-serif text-xl text-navy">Ваша бронь</p>
              <dl className="mt-4 space-y-3 text-sm">
                <Row label="Гость">
                  {booking.last_name} {booking.first_name}
                </Row>
                <Row label="Номер">{booking.room_name}</Row>
                <Row label="Заезд">
                  {format(parseISO(booking.check_in), "d MMM yyyy", { locale: ru })}
                </Row>
                <Row label="Выезд">
                  {format(parseISO(booking.check_out), "d MMM yyyy", { locale: ru })}
                </Row>
                <Row label="Ночей">{booking.nights}</Row>
                <Row label="Гости">
                  {booking.adults} взр.
                  {booking.children > 0 && ` + ${booking.children} дет.`}
                </Row>
              </dl>

              <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Итого за проживание</span>
                  <span>{fmtRub(booking.total_price)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>К доплате при заезде</span>
                  <span>{fmtRub(booking.remaining_amount)}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3 text-navy">
                  <span className="text-[11px] uppercase tracking-widest">
                    К оплате сейчас
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
