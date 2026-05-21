import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon, Check, ChevronRight, Minus, Plus, Users } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange, GuestParty } from "./types";
import { nightsBetween } from "./types";

type Props = {
  dates: DateRange;
  onDatesChange: (v: DateRange) => void;
  party: GuestParty;
  onPartyChange: (v: GuestParty) => void;
  promoCode: string;
  onPromoChange: (v: string) => void;
  onContinue: () => void;
};

function fmtShort(d?: Date) {
  if (!d) return "—";
  return format(d, "EEE d MMM", { locale: ru });
}

export function Step1Dates({
  dates,
  onDatesChange,
  party,
  onPartyChange,
  promoCode,
  onPromoChange,
  onContinue,
}: Props) {
  const nights = nightsBetween(dates.from, dates.to);
  const canContinue = nights > 0;
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[320px_1fr] lg:py-16">
      {/* LEFT PANEL */}
      <aside className="space-y-5 self-start bg-[#f5f2ee] p-6">
        {/* Hotel block */}
        <div className="border-b border-border pb-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Гостиница
          </p>
          <p className="mt-2 flex items-start gap-2 text-sm text-navy">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A96E]" strokeWidth={2} />
            Гостиница «Полуостров», Петропавловск-Камчатский
          </p>
        </div>

        {/* Guests */}
        <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="group flex w-full items-center justify-between border-b border-border pb-4 text-left"
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Номера и гости
                </p>
                <p className="mt-2 text-sm text-navy">
                  1 номер · {party.adults} взр. · {party.children} дет.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-5">
            <p className="font-serif text-lg text-navy">Комната 1</p>
            <div className="mt-4 space-y-3">
              <CounterRow
                label="Взрослых"
                value={party.adults}
                min={1}
                max={6}
                onChange={(v) => onPartyChange({ ...party, adults: v })}
              />
              <CounterRow
                label="Детей (до 12 лет)"
                value={party.children}
                min={0}
                max={4}
                onChange={(v) => onPartyChange({ ...party, children: v })}
              />
            </div>
            <button
              type="button"
              onClick={() => setGuestsOpen(false)}
              className="mt-5 w-full bg-[#1a1a1a] py-3 text-[11px] uppercase tracking-[2px] text-white transition-colors hover:bg-[#C9A96E]"
            >
              Применить
            </button>
          </PopoverContent>
        </Popover>

        {/* Dates */}
        <Popover open={datesOpen} onOpenChange={setDatesOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="group flex w-full items-center justify-between border-b border-border pb-4 text-left"
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Даты
                </p>
                {nights > 0 ? (
                  <p className="mt-2 text-sm text-navy">
                    {fmtShort(dates.from)} — {fmtShort(dates.to)} · {nights} {nightsWord(nights)}
                  </p>
                ) : (
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4 text-[#C9A96E]" strokeWidth={1.5} />
                    Заезд — Выезд
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-4">
            <p className="mb-3 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
              Выберите даты
            </p>
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={dates.from ? { from: dates.from, to: dates.to } : undefined}
              onSelect={(range) =>
                onDatesChange({ from: range?.from, to: range?.to })
              }
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              locale={ru}
              className={cn("p-0 pointer-events-auto")}
            />
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Заезд в 14:00 · Выезд до 12:00
            </p>
          </PopoverContent>
        </Popover>

        {/* Promo */}
        <div className="border-b border-border pb-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Промокод
          </p>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => onPromoChange(e.target.value)}
            placeholder="Введите промокод (необязательно)"
            className="mt-2 w-full border-0 bg-transparent p-0 text-sm text-navy outline-none placeholder:text-muted-foreground"
          />
        </div>

        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className="w-full bg-[#1a1a1a] py-4 text-[11px] uppercase tracking-[2px] text-white transition-colors hover:bg-[#C9A96E] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Показать доступные номера
        </button>
      </aside>

      {/* RIGHT INFO PANEL */}
      <div className="self-start">
        <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">
          Шаг 01 — Назначение
        </p>
        <h1 className="mt-3 font-serif text-4xl text-navy sm:text-5xl">
          Выберите даты пребывания
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          Укажите даты заезда и выезда, количество гостей и при наличии — промокод.
          После этого мы покажем все доступные на ваши даты номера и тарифы.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <InfoTile
            icon={<Users className="h-5 w-5 text-[#C9A96E]" strokeWidth={1.5} />}
            title="Размещение"
            text="До 4 гостей в одном номере. Дети до 5 лет — бесплатно."
          />
          <InfoTile
            icon={<CalendarIcon className="h-5 w-5 text-[#C9A96E]" strokeWidth={1.5} />}
            title="Время"
            text="Заезд с 14:00, выезд до 12:00. Ранний заезд по запросу."
          />
        </div>
      </div>
    </div>
  );
}

function CounterRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-navy">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-8 w-8 items-center justify-center border border-border text-navy transition-colors hover:border-[#C9A96E] disabled:opacity-30"
        >
          <Minus className="h-3 w-3" strokeWidth={2} />
        </button>
        <span className="w-6 text-center text-sm text-navy">{value}</span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center border border-border text-navy transition-colors hover:border-[#C9A96E] disabled:opacity-30"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="border border-border bg-cream/40 p-5">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[11px] uppercase tracking-widest text-navy">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function nightsWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "ночь";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "ночи";
  return "ночей";
}
