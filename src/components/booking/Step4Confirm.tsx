import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { CreditCard, FileText } from "lucide-react";
import type { BookingState } from "./types";
import { calcTotals } from "./types";
import { StaySummary } from "./StaySummary";
import { cn } from "@/lib/utils";
import { createBooking } from "@/lib/booking.functions";

type Props = {
  state: BookingState;
  patch: (p: Partial<BookingState>) => void;
  onEditStep: (step: 1 | 2 | 3) => void;
  onBack: () => void;
};

export function Step4Confirm({ state, patch, onEditStep, onBack }: Props) {
  const navigate = useNavigate();
  const submit = useServerFn(createBooking);
  const [submitting, setSubmitting] = useState(false);

  const { guest, messenger, paymentMethod, idConsent, termsConsent, selected, dates } = state;

  const valid =
    guest.firstName.trim() &&
    guest.lastName.trim() &&
    guest.phone.trim().length >= 5 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guest.email.trim()) &&
    paymentMethod &&
    idConsent &&
    termsConsent &&
    selected &&
    dates.from &&
    dates.to;

  const onSubmit = async () => {
    if (!valid || !selected || !dates.from || !dates.to) return;
    setSubmitting(true);
    const totals = calcTotals(state);
    try {
      const { booking_number } = await submit({
        data: {
          salutation: guest.salutation,
          first_name: guest.firstName.trim(),
          last_name: guest.lastName.trim(),
          phone: guest.phone.trim(),
          email: guest.email.trim(),
          city: guest.city.trim() || null,
          country: guest.country.trim() || null,
          room_id: selected.room.id,
          room_name: selected.room.name_ru,
          check_in: format(dates.from, "yyyy-MM-dd"),
          check_out: format(dates.to, "yyyy-MM-dd"),
          nights: totals.nights,
          adults: state.party.adults,
          children: state.party.children,
          meal_plan: selected.mealPlan,
          special_requests: state.requests,
          custom_request: state.customRequest.trim() || null,
          promo_code: state.promoCode.trim() || null,
          messenger_type: messenger.type,
          messenger_username:
            messenger.type !== "none" && messenger.username.trim()
              ? messenger.username.trim()
              : null,
          room_price_total: totals.roomTotal,
          breakfast_total: totals.breakfastTotal,
          total_price: totals.total,
          payment_method: paymentMethod,
          id_consent: true,
          terms_consent: true,
        },
      });
      navigate({ to: "/booking/success", search: { n: booking_number, e: guest.email } });
    } catch (err) {
      console.error(err);
      toast.error("Не удалось отправить заявку. Попробуйте ещё раз.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px] lg:py-16">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">
          Шаг 04 — Подтверждение
        </p>
        <h1 className="mt-3 font-serif text-4xl text-navy sm:text-5xl">
          Подтвердить бронирование
        </h1>

        {/* Salutation */}
        <div className="mt-10">
          <p className="text-[11px] uppercase tracking-widest text-navy">Обращение</p>
          <div className="mt-3 flex gap-6">
            {(["mr", "mrs"] as const).map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-2 text-sm text-navy">
                <input
                  type="radio"
                  name="salutation"
                  className="h-4 w-4 accent-[#C9A96E]"
                  checked={guest.salutation === s}
                  onChange={() => patch({ guest: { ...guest, salutation: s } })}
                />
                {s === "mr" ? "Господин" : "Госпожа"}
              </label>
            ))}
          </div>
        </div>

        {/* Guest fields */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Имя*" value={guest.firstName}
            onChange={(v) => patch({ guest: { ...guest, firstName: v } })} />
          <Field label="Фамилия*" value={guest.lastName}
            onChange={(v) => patch({ guest: { ...guest, lastName: v } })} />
          <Field label="Телефон*" prefix="🇷🇺 +7" value={guest.phone}
            onChange={(v) => patch({ guest: { ...guest, phone: v } })} />
          <Field label="Email*" type="email" value={guest.email}
            onChange={(v) => patch({ guest: { ...guest, email: v } })} />
          <Field label="Город" value={guest.city}
            onChange={(v) => patch({ guest: { ...guest, city: v } })} />
          <Field label="Страна" value={guest.country}
            onChange={(v) => patch({ guest: { ...guest, country: v } })} />
        </div>

        {/* Messenger */}
        <div className="mt-8 border-t border-border pt-8">
          <p className="text-[11px] uppercase tracking-widest text-navy">
            Куда отправить напоминание за день до заезда?
          </p>
          <div className="mt-3 flex flex-wrap gap-6">
            {([
              { v: "telegram", label: "Telegram" },
              { v: "vk_max", label: "ВКонтакте / Макс" },
              { v: "none", label: "Не нужно" },
            ] as const).map((m) => (
              <label key={m.v} className="flex cursor-pointer items-center gap-2 text-sm text-navy">
                <input
                  type="radio"
                  name="messenger"
                  className="h-4 w-4 accent-[#C9A96E]"
                  checked={messenger.type === m.v}
                  onChange={() => patch({ messenger: { ...messenger, type: m.v } })}
                />
                {m.label}
              </label>
            ))}
          </div>
          {messenger.type !== "none" && (
            <input
              type="text"
              value={messenger.username}
              onChange={(e) =>
                patch({ messenger: { ...messenger, username: e.target.value } })
              }
              placeholder="@username или номер телефона"
              className="mt-3 w-full max-w-sm border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[#C9A96E]"
            />
          )}
        </div>

        {/* Payment */}
        <div className="mt-8 border-t border-border pt-8">
          <p className="text-[11px] uppercase tracking-widest text-navy">
            Способ оплаты
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            После отправки заявки наш менеджер свяжется с вами в течение часа для подтверждения и оплаты.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PaymentCard
              icon={<CreditCard className="h-5 w-5 text-[#C9A96E]" strokeWidth={1.5} />}
              title="Банковская карта"
              subtitle="Visa / МИР / Mastercard · СБП · SberPay"
              selected={paymentMethod === "card"}
              onClick={() => patch({ paymentMethod: "card" })}
            />
            <PaymentCard
              icon={<FileText className="h-5 w-5 text-[#C9A96E]" strokeWidth={1.5} />}
              title="Оплата по счёту"
              subtitle="Для юр. лиц и ИП. Реквизиты отправим на email"
              selected={paymentMethod === "invoice"}
              onClick={() => patch({ paymentMethod: "invoice" })}
            />
          </div>
        </div>

        {/* Consents */}
        <div className="mt-8 space-y-3 border-t border-border pt-8">
          <ConsentRow
            checked={idConsent}
            onChange={(v) => patch({ idConsent: v })}
            text="Я предъявлю документ, удостоверяющий личность, при регистрации."
          />
          <ConsentRow
            checked={termsConsent}
            onChange={(v) => patch({ termsConsent: v })}
            text="Я ознакомился и согласен с Условиями бронирования и Политикой конфиденциальности (ФЗ-152)."
          />
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="text-[11px] uppercase tracking-widest text-muted-foreground hover:text-navy"
          >
            ← Назад
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!valid || submitting}
            className={cn(
              "h-14 w-full max-w-md bg-[#1a1a1a] text-[11px] uppercase tracking-[2px] text-white transition-colors hover:bg-[#C9A96E]",
              (!valid || submitting) && "cursor-not-allowed opacity-40 hover:bg-[#1a1a1a]",
            )}
          >
            {submitting ? "Отправляем…" : "Завершить бронирование"}
          </button>
        </div>
      </div>

      <StaySummary state={state} onEditStep={onEditStep} showBreakdown />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  prefix?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5 flex items-center border border-border bg-background focus-within:border-[#C9A96E]">
        {prefix && (
          <span className="border-r border-border px-3 py-3 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-4 py-3 text-sm text-navy outline-none"
        />
      </div>
    </label>
  );
}

function PaymentCard({
  icon,
  title,
  subtitle,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 border bg-card p-5 text-left transition-colors",
        selected ? "border-[#C9A96E] ring-1 ring-[#C9A96E]" : "border-border hover:border-[#C9A96E]",
      )}
    >
      {icon}
      <p className="text-sm text-navy">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </button>
  );
}

function ConsentRow({
  checked,
  onChange,
  text,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  text: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-navy">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#C9A96E]"
      />
      <span className="leading-relaxed">{text}</span>
    </label>
  );
}
