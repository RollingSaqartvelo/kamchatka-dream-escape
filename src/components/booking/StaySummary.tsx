import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { CalendarDays, MapPin, BedDouble, Users, Pencil } from "lucide-react";
import type { BookingState } from "./types";
import { calcTotals, fmtRub } from "./types";
import { dfLocale } from "./Step1Dates";

type Props = {
  state: BookingState;
  onEditStep: (step: 1 | 2 | 3) => void;
  showBreakdown?: boolean;
};

export function StaySummary({ state, onEditStep, showBreakdown = false }: Props) {
  const { t, i18n } = useTranslation();
  const loc = dfLocale(i18n.language);
  const totals = calcTotals(state);
  const { dates, party, selected } = state;
  return (
    <aside className="space-y-4 self-start border border-border bg-cream/50 p-6 lg:sticky lg:top-32">
      <p className="font-serif text-xl text-navy">{t("booking.summary.title")}</p>

      <Row
        icon={<MapPin className="h-4 w-4 text-[#C9A96E]" strokeWidth={1.5} />}
        title={t("booking.summary.hotelName")}
        subtitle={t("booking.summary.hotelCity")}
      />

      <Row
        icon={<CalendarDays className="h-4 w-4 text-[#C9A96E]" strokeWidth={1.5} />}
        title={
          dates.from && dates.to
            ? `${format(dates.from, "d MMM", { locale: loc })} — ${format(dates.to, "d MMM yyyy", { locale: loc })}`
            : t("booking.summary.noDates")
        }
        subtitle={totals.nights ? t("booking.summary.nights", { n: totals.nights }) : undefined}
        onEdit={() => onEditStep(1)}
      />

      <Row
        icon={<Users className="h-4 w-4 text-[#C9A96E]" strokeWidth={1.5} />}
        title={t("booking.summary.roomsGuests", { n: party.adults + party.children })}
        subtitle={
          party.children
            ? t("booking.summary.adultsChildren", { a: party.adults, c: party.children })
            : t("booking.summary.adultsOnly", { a: party.adults })
        }
        onEdit={() => onEditStep(1)}
      />

      {selected && (
        <>
          <Row
            icon={<BedDouble className="h-4 w-4 text-[#C9A96E]" strokeWidth={1.5} />}
            title={selected.room.name_ru}
            subtitle={
              selected.mealPlan === "breakfast"
                ? t("booking.summary.withBreakfast")
                : t("booking.summary.roomOnly")
            }
            onEdit={() => onEditStep(2)}
          />
          {showBreakdown && (
            <div className="mt-2 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("booking.summary.roomCost", { n: totals.nights })}</span>
                <span>{fmtRub(totals.roomTotal)}</span>
              </div>
              {totals.breakfastTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("booking.summary.breakfast", { g: totals.guests, n: totals.nights })}</span>
                  <span>{fmtRub(totals.breakfastTotal)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-border pt-3 text-navy">
                <span className="text-[11px] uppercase tracking-widest">{t("booking.summary.total")}</span>
                <span className="font-serif text-xl">{fmtRub(totals.total)}</span>
              </div>
            </div>
          )}
          {!showBreakdown && (
            <div className="mt-2 flex justify-between border-t border-border pt-4">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {t("booking.summary.sum")}
              </span>
              <span className="font-serif text-xl text-navy">{fmtRub(totals.total)}</span>
            </div>
          )}
        </>
      )}
    </aside>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onEdit,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onEdit?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0">
      <div className="flex items-start gap-2">
        <span className="mt-0.5">{icon}</span>
        <div>
          <p className="text-sm text-navy">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-[#C9A96E] hover:text-gold-dark"
        >
          <Pencil className="h-3 w-3" strokeWidth={1.5} />
          {t("booking.summary.edit")}
        </button>
      )}
    </div>
  );
}
