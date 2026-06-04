import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { sourceIcon, sourceLabel } from "@/lib/channels";
import { inspectTravellineOffer } from "@/lib/travelline-booking.functions";

// Полная карточка брони — открывается по клику в календаре/списке.
// Показывает всё, что у нас есть: гость, канал/источник, тариф, время заезда,
// гостей, финансы (проживание/услуги/итого/оплачено/баланс), комментарии.

export type DetailBk = {
  id: string;
  booking_number: string;
  tl_reservation_id?: string | null;
  first_name: string;
  last_name: string;
  salutation?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  room_id: string;
  room_name: string;
  room_unit?: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  adults?: number;
  children?: number;
  meal_plan?: string | null;
  payment_status: string;
  source?: string | null;
  total_price: number;
  room_price_total?: number | null;
  breakfast_total?: number | null;
  prepayment_amount?: number | null;
  remaining_amount?: number | null;
  created_at?: string | null;
  custom_request?: string | null;
  admin_notes?: string | null;
  // special_requests: массив (сайт) ИЛИ объект-мета (TravelLine)
  special_requests?: unknown;
};

type TlMeta = {
  kind?: string;
  tariff?: string;
  arrival?: string;
  departure?: string;
  prepaid?: number;
  servicesTotal?: number;
  guests?: string[];
  organizer?: string;
  groupSize?: number;
  roomNo?: number;
  mealPlan?: string;
  sourceUrl?: string;
  channelCode?: string;
  bookedAt?: string;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-400 text-amber-950 border-amber-500",
  confirmed: "bg-blue-500 text-white border-blue-700",
  paid: "bg-emerald-500 text-white border-emerald-700",
  cancelled: "bg-rose-400 text-white border-rose-500",
  completed: "bg-zinc-400 text-white border-zinc-600",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Новая бронь",
  confirmed: "Подтверждена",
  paid: "Оплачена",
  cancelled: "Отменена",
  completed: "Завершена",
};
const STATUSES = ["pending", "confirmed", "paid", "completed", "cancelled"] as const;

const fmtRub = (n: number | null | undefined) =>
  "₽ " + new Intl.NumberFormat("ru-RU").format(Math.round(n ?? 0));

function dt(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  // принимает "2026-07-10" или "2026-07-10T14:00"
  const d = parseISO(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(+d)) return { date: iso, time: "" };
  const hasTime = iso.includes("T") && !iso.endsWith("T00:00") && iso.slice(11, 16) !== "00:00";
  return { date: format(d, "d MMM yyyy", { locale: ru }), time: hasTime ? iso.slice(11, 16) : "" };
}

export function BookingDetailDrawer({
  booking,
  onClose,
  onChangeStatus,
}: {
  booking: DetailBk;
  onClose: () => void;
  onChangeStatus?: (id: string, status: string) => void;
}) {
  const b = booking;
  const inspectTl = useServerFn(inspectTravellineOffer);
  const [tlResult, setTlResult] = useState<string | null>(null);
  const [tlLoading, setTlLoading] = useState(false);
  async function runTlDiagnose() {
    setTlLoading(true);
    try {
      const r = await inspectTl({ data: { bookingId: b.id } });
      setTlResult(JSON.stringify(r, null, 2));
    } catch (e: any) {
      toast.error("TravelLine: " + (e?.message ?? "ошибка"));
    } finally {
      setTlLoading(false);
    }
  }
  const meta: TlMeta | null =
    b.special_requests && !Array.isArray(b.special_requests) && typeof b.special_requests === "object"
      ? (b.special_requests as TlMeta)
      : null;
  const requestsList: string[] = Array.isArray(b.special_requests) ? (b.special_requests as string[]) : [];

  const guestName = `${b.last_name ?? ""} ${b.first_name ?? ""}`.trim() || "Гость";
  const isTl = Boolean(b.tl_reservation_id) || meta?.kind === "tl";
  const src = b.source ?? "manual";

  const arrival = dt(meta?.arrival ?? b.check_in);
  const departure = dt(meta?.departure ?? b.check_out);
  const booked = dt(meta?.bookedAt ?? b.created_at ?? null);

  const proj = b.room_price_total ?? b.total_price;
  const services = meta?.servicesTotal ?? b.breakfast_total ?? 0;
  const paid = b.prepayment_amount ?? meta?.prepaid ?? 0;
  const balance = b.remaining_amount ?? Math.max(0, b.total_price - paid);

  const guests = meta?.guests?.length ? meta.guests : [guestName];
  const realEmail = b.email && !b.email.includes("noemail") ? b.email : "";
  const phone = b.phone || "";
  const comment = [b.custom_request, b.admin_notes, ...requestsList].filter(Boolean).join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-cream/60 px-6 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-xl text-navy">{guestName}</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {b.tl_reservation_id || b.booking_number}
              </p>
            </div>
            <button onClick={onClose} className="-mt-1 text-2xl leading-none text-muted-foreground hover:text-navy">
              ×
            </button>
          </div>
          <span
            className={`mt-2 inline-block rounded border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[b.payment_status] ?? STATUS_COLOR.pending}`}
          >
            {STATUS_LABEL[b.payment_status] ?? b.payment_status}
          </span>
        </div>

        <div className="flex-1 px-6 py-5">
          {/* Групповая бронь */}
          {meta?.groupSize && meta.groupSize > 1 && (
            <div className="mb-5 rounded border border-[#C9A96E]/50 bg-[#C9A96E]/10 px-3 py-2 text-xs text-navy">
              👥 Групповая бронь · номер {meta.roomNo} из {meta.groupSize}
              {meta.organizer ? (
                <div className="mt-0.5 text-muted-foreground">Организатор: {meta.organizer}</div>
              ) : null}
            </div>
          )}

          {/* Stay */}
          <Section title="Проживание">
            <Row label="Заезд" value={arrival.date} hint={arrival.time && `${arrival.time}`} />
            <Row label="Выезд" value={departure.date} hint={departure.time && `${departure.time}`} />
            <Row label="Ночей" value={String(b.nights)} />
            <Row label="Категория" value={b.room_name} />
            {b.room_unit && <Row label="Номер комнаты" value={`№ ${b.room_unit}`} />}
            {meta?.tariff && <Row label="Тариф" value={meta.tariff} />}
            {meta?.mealPlan && <Row label="Питание" value={meta.mealPlan} />}
            <Row
              label="Гостей"
              value={`${b.adults ?? 1} взр.${b.children ? ` · ${b.children} дет.` : ""}`}
            />
          </Section>

          {/* Guests */}
          {guests.length > 0 && (
            <Section title={guests.length > 1 ? `Гости (${guests.length})` : "Гость"}>
              {guests.map((g, i) => (
                <div key={i} className="py-0.5 text-sm text-navy">
                  {i + 1}. {g}
                </div>
              ))}
            </Section>
          )}

          {/* Source / contacts */}
          <Section title="Источник и контакты">
            <Row
              label={isTl ? "Канал" : "Источник"}
              value={`${sourceIcon(src)} ${sourceLabel(src)}`}
            />
            {isTl && <Row label="Компания-агент" value={`Channel-менеджер: ${sourceLabel(src)}`} />}
            {meta?.sourceUrl ? (
              <Row label="Ссылка" value={<a href={meta.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">открыть</a>} />
            ) : null}
            {phone ? <Row label="Телефон" value={phone} /> : null}
            {realEmail ? <Row label="Email" value={realEmail} /> : null}
            {(b.city || b.country) && <Row label="Город" value={[b.city, b.country].filter(Boolean).join(", ")} />}
            {!phone && !realEmail && isTl && (
              <p className="py-1 text-xs text-muted-foreground">
                Телефон/email не передаются партнёрским API канала.
              </p>
            )}
          </Section>

          {/* Comment */}
          {comment && (
            <Section title="Комментарий">
              <p className="text-sm text-navy">{comment}</p>
            </Section>
          )}

          {/* Money */}
          <Section title="Оплата">
            <Row label="Сумма за проживание" value={fmtRub(proj)} />
            {services > 0 && <Row label="Услуги" value={fmtRub(services)} />}
            <div className="my-2 border-t border-border" />
            <Row label="Итого" value={<span className="font-serif text-lg text-navy">{fmtRub(b.total_price)}</span>} />
            <Row label="Оплачено" value={<span className="text-emerald-700">{fmtRub(paid)}</span>} />
            <Row
              label="К оплате (баланс)"
              value={<span className={balance > 0 ? "text-rose-700" : "text-emerald-700"}>{fmtRub(balance)}</span>}
            />
            {booked.date !== "—" && <Row label="Дата бронирования" value={booked.date} />}
          </Section>

          {/* Status actions */}
          {onChangeStatus && (
            <Section title="Сменить статус">
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => onChangeStatus(b.id, s)}
                    className={`rounded border px-2 py-1 text-[11px] ${
                      b.payment_status === s
                        ? STATUS_COLOR[s]
                        : "border-border text-muted-foreground hover:border-navy hover:text-navy"
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* TravelLine — диагностика предложения (безопасно, только поиск) */}
          <Section title="TravelLine (диагностика)">
            <button
              onClick={() => void runTlDiagnose()}
              disabled={tlLoading}
              className="border border-[#C9A96E] px-3 py-1.5 text-[11px] uppercase tracking-widest text-[#C9A96E] hover:bg-[#C9A96E] hover:text-white disabled:opacity-50"
            >
              {tlLoading ? "Проверяем…" : "Проверить предложение в TravelLine"}
            </button>
            {tlResult && (
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-cream/50 p-2 text-[10px] leading-tight text-navy">
                {tlResult}
              </pre>
            )}
          </Section>

          <a
            href={`/admin/document/${b.id}`}
            className="mt-4 mr-2 inline-block border border-[#C9A96E] px-4 py-2 text-[10px] uppercase tracking-widest text-[#C9A96E] hover:bg-[#C9A96E] hover:text-white"
          >
            Счёт / УПД
          </a>
          <a
            href="/admin/bookings"
            className="mt-4 inline-block border border-navy px-4 py-2 text-[10px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream"
          >
            Открыть в списке броней
          </a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-[#C9A96E]">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string | false;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right text-navy">
        {value}
        {hint ? <span className="ml-1 text-xs text-muted-foreground">· {hint}</span> : null}
      </span>
    </div>
  );
}
