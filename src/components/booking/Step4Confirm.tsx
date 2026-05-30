import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import type { BookingState } from "./types";
import { calcTotals, fmtRub } from "./types";
import { StaySummary } from "./StaySummary";
import { cn } from "@/lib/utils";
import { createBooking, calcPrepayment } from "@/lib/booking.functions";
import {
  getMyProfile,
  upsertMyProfile,
  linkBookingToMe,
} from "@/lib/profile.functions";
import { useAuth } from "@/lib/useAuth";

type Props = {
  state: BookingState;
  patch: (p: Partial<BookingState>) => void;
  onEditStep: (step: 1 | 2 | 3) => void;
  onBack: () => void;
};

export function Step4Confirm({ state, patch, onEditStep, onBack }: Props) {
  const navigate = useNavigate();
  const submit = useServerFn(createBooking);
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(upsertMyProfile);
  const linkBooking = useServerFn(linkBookingToMe);
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Prefill from profile when user is logged in
  useEffect(() => {
    if (!user || prefilled) return;
    setPrefilled(true);
    fetchProfile()
      .then((p) => {
        if (!p) return;
        const g = state.guest;
        const isEmpty = !g.firstName && !g.lastName && !g.phone && !g.email;
        if (!isEmpty) return;
        patch({
          guest: {
            salutation: (p.salutation as "mr" | "mrs" | null) ?? null,
            firstName: p.first_name ?? "",
            lastName: p.last_name ?? "",
            phone: p.phone ?? "",
            email: p.email ?? user.email ?? "",
            city: p.city ?? "",
            country: p.country ?? "",
          },
          messenger: {
            type: (p.messenger_type as "telegram" | "vk_max" | "none") ?? "none",
            username: p.messenger_username ?? "",
          },
        });
      })
      .catch(() => {});
  }, [user, prefilled, fetchProfile, state.guest, patch]);


  const { guest, messenger, idConsent, termsConsent, selected, dates } = state;
  const totals = calcTotals(state);
  const prepayment = calcPrepayment(totals.total, totals.nights);
  const remaining = Math.max(0, totals.total - prepayment);

  const valid =
    guest.firstName.trim() &&
    guest.lastName.trim() &&
    guest.phone.trim().length >= 5 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guest.email.trim()) &&
    idConsent &&
    termsConsent &&
    selected &&
    dates.from &&
    dates.to;

  const onSubmit = async () => {
    if (!valid || !selected || !dates.from || !dates.to) return;
    setSubmitting(true);
    try {
      const { id, booking_number } = await submit({
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
          prepayment_amount: prepayment,
          remaining_amount: remaining,
          id_consent: true,
          terms_consent: true,
        },
      });
      void booking_number;

      // If user is logged in: link booking + save profile data for next time
      if (user) {
        try {
          await Promise.all([
            linkBooking({ data: { bookingId: id } }),
            saveProfile({
              data: {
                salutation: guest.salutation,
                first_name: guest.firstName.trim(),
                last_name: guest.lastName.trim(),
                phone: guest.phone.trim(),
                email: guest.email.trim(),
                city: guest.city.trim() || null,
                country: guest.country.trim() || null,
                messenger_type: messenger.type,
                messenger_username:
                  messenger.type !== "none" && messenger.username.trim()
                    ? messenger.username.trim()
                    : null,
              },
            }),
          ]);
        } catch (e) {
          console.warn("Profile sync failed:", e);
        }
      }

      navigate({
        to: "/booking/pay/$id",
        params: { id },
        search: { e: guest.email.trim() },
      });
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
          <PhoneField value={guest.phone}
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

        {/* Prepayment block */}
        <div className="mt-8 border-t border-border pt-8">
          <p className="text-[11px] uppercase tracking-widest text-navy">
            Оплата
          </p>
          <div className="mt-4 border border-[#C9A96E]/40 bg-[#C9A96E]/5 p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-navy">Предоплата сейчас</span>
              <span className="font-serif text-2xl text-navy">{fmtRub(prepayment)}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between text-sm text-muted-foreground">
              <span>К доплате при заезде</span>
              <span>{fmtRub(remaining)}</span>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Карта · СБП · SberPay · оплата по счёту — выберете на следующем шаге.
              Предоплата = бо́льшее из 30% стоимости и цены одной ночи.
            </p>
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
            {submitting ? "Создаём бронь…" : "Перейти к оплате"}
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

const DIAL_CODES = [
  { code: "+7", flag: "🇷🇺", label: "Россия" },
  { code: "+375", flag: "🇧🇾", label: "Беларусь" },
  { code: "+380", flag: "🇺🇦", label: "Украина" },
  { code: "+77", flag: "🇰🇿", label: "Казахстан" },
  { code: "+998", flag: "🇺🇿", label: "Узбекистан" },
  { code: "+86", flag: "🇨🇳", label: "Китай" },
  { code: "+81", flag: "🇯🇵", label: "Япония" },
  { code: "+82", flag: "🇰🇷", label: "Корея" },
  { code: "+1", flag: "🇺🇸", label: "США / Канада" },
  { code: "+44", flag: "🇬🇧", label: "Великобритания" },
  { code: "+49", flag: "🇩🇪", label: "Германия" },
  { code: "+33", flag: "🇫🇷", label: "Франция" },
  { code: "+39", flag: "🇮🇹", label: "Италия" },
  { code: "+34", flag: "🇪🇸", label: "Испания" },
  { code: "+90", flag: "🇹🇷", label: "Турция" },
  { code: "+971", flag: "🇦🇪", label: "ОАЭ" },
  { code: "+91", flag: "🇮🇳", label: "Индия" },
];

// Match longest dial code first so e.g. +375 wins over +7.
const DIAL_BY_LENGTH = [...DIAL_CODES].sort((a, b) => b.code.length - a.code.length);

function splitPhone(full: string): { dial: string; rest: string } {
  const trimmed = full.trim();
  const match = DIAL_BY_LENGTH.find((d) => trimmed.startsWith(d.code));
  if (match) return { dial: match.code, rest: trimmed.slice(match.code.length).trim() };
  return { dial: "+7", rest: trimmed };
}

/** Phone input with a country dial-code selector; stores the full international
 *  number (e.g. "+7 9991234567") in a single string value. */
function PhoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { dial, rest } = splitPhone(value);
  const combine = (d: string, r: string) => onChange(r ? `${d} ${r}` : d === "+7" && !r ? "" : d);
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
        Телефон*
      </span>
      <div className="mt-1.5 flex items-center border border-border bg-background focus-within:border-[#C9A96E]">
        <select
          value={dial}
          onChange={(e) => combine(e.target.value, rest)}
          aria-label="Код страны"
          className="shrink-0 border-r border-border bg-transparent py-3 pl-3 pr-2 text-sm text-navy outline-none"
        >
          {DIAL_CODES.map((c) => (
            <option key={`${c.code}-${c.label}`} value={c.code}>
              {c.flag} {c.code}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="tel"
          value={rest}
          onChange={(e) => combine(dial, e.target.value)}
          placeholder="999 123-45-67"
          className="w-full bg-transparent px-4 py-3 text-sm text-navy outline-none"
        />
      </div>
    </label>
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
