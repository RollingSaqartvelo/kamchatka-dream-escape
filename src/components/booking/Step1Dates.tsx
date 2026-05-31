import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, type Locale } from "date-fns";
import { ru, enUS, zhCN } from "date-fns/locale";
import { Calendar as CalendarIcon, Check, ChevronRight, Minus, Plus, Users } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange, GuestParty } from "./types";
import { nightsBetween } from "./types";

/** date-fns locale matching the active UI language. */
export function dfLocale(lang: string): Locale {
  if (lang.startsWith("en")) return enUS;
  if (lang.startsWith("zh")) return zhCN;
  return ru;
}

type Props = {
  dates: DateRange;
  onDatesChange: (v: DateRange) => void;
  party: GuestParty;
  onPartyChange: (v: GuestParty) => void;
  promoCode: string;
  onPromoChange: (v: string) => void;
  onContinue: () => void;
};

function fmtShort(d: Date | undefined, loc: Locale) {
  if (!d) return "—";
  return format(d, "EEE d MMM", { locale: loc });
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
  const { t, i18n } = useTranslation();
  const loc = dfLocale(i18n.language);
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
            {t("booking.step1.hotel")}
          </p>
          <p className="mt-2 flex items-start gap-2 text-sm text-navy">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A96E]" strokeWidth={2} />
            {t("booking.step1.hotelName")}
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
                  {t("booking.step1.roomsGuests")}
                </p>
                <p className="mt-2 text-sm text-navy">
                  {t("booking.step1.roomsGuestsValue", { a: party.adults, c: party.children })}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-5">
            <p className="font-serif text-lg text-navy">{t("booking.step1.room1")}</p>
            <div className="mt-4 space-y-3">
              <CounterRow
                label={t("booking.step1.adults")}
                value={party.adults}
                min={1}
                max={6}
                onChange={(v) => onPartyChange({ ...party, adults: v })}
              />
              <CounterRow
                label={t("booking.step1.childrenLabel")}
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
              {t("booking.step1.apply")}
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
                  {t("booking.step1.dates")}
                </p>
                {nights > 0 ? (
                  <p className="mt-2 text-sm text-navy">
                    {fmtShort(dates.from, loc)} — {fmtShort(dates.to, loc)} · {nights}{" "}
                    {t("booking.step1.nights", { count: nights })}
                  </p>
                ) : (
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4 text-[#C9A96E]" strokeWidth={1.5} />
                    {t("booking.step1.datesPick")}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-4">
            <p className="mb-3 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("booking.step1.datesChoose")}
            </p>
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={dates.from ? { from: dates.from, to: dates.to } : undefined}
              onSelect={(range) =>
                onDatesChange({ from: range?.from, to: range?.to })
              }
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              locale={loc}
              className={cn("p-0 pointer-events-auto")}
            />
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {t("booking.step1.datesTimes")}
            </p>
          </PopoverContent>
        </Popover>

        {/* Promo */}
        <div className="border-b border-border pb-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("booking.step1.promo")}
          </p>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => onPromoChange(e.target.value)}
            placeholder={t("booking.step1.promoPh")}
            className="mt-2 w-full border-0 bg-transparent p-0 text-sm text-navy outline-none placeholder:text-muted-foreground"
          />
        </div>

        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className="w-full bg-[#1a1a1a] py-4 text-[11px] uppercase tracking-[2px] text-white transition-colors hover:bg-[#C9A96E] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("booking.step1.continue")}
        </button>
      </aside>

      {/* RIGHT INFO PANEL */}
      <div className="self-start">
        <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">
          {t("booking.step1.stepEyebrow")}
        </p>
        <h1 className="mt-3 font-serif text-4xl text-navy sm:text-5xl">
          {t("booking.step1.stepTitle")}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          {t("booking.step1.stepIntro")}
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <InfoTile
            icon={<Users className="h-5 w-5 text-[#C9A96E]" strokeWidth={1.5} />}
            title={t("booking.step1.placementTitle")}
            text={t("booking.step1.placementText")}
          />
          <InfoTile
            icon={<CalendarIcon className="h-5 w-5 text-[#C9A96E]" strokeWidth={1.5} />}
            title={t("booking.step1.timeTitle")}
            text={t("booking.step1.timeText")}
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
