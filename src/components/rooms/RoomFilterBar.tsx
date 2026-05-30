import { useTranslation } from "react-i18next";
import { Users, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/components/booking/types";

type Props = {
  guests: number;
  onGuestsChange: (n: number) => void;
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  onApply: () => void;
};

function fmtRange(range: DateRange, placeholder: string) {
  if (range.from && range.to)
    return `${format(range.from, "d MMM", { locale: ru })} — ${format(range.to, "d MMM", { locale: ru })}`;
  if (range.from) return format(range.from, "d MMM", { locale: ru });
  return placeholder;
}

export function RoomFilterBar({
  guests,
  onGuestsChange,
  range,
  onRangeChange,
  onApply,
}: Props) {
  const { t } = useTranslation();
  const hasRange = Boolean(range.from);
  return (
    <div className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-6 lg:px-8">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 overflow-x-auto">
          <label className="flex items-center gap-2 text-sm text-navy">
            <Users className="h-4 w-4 text-gold" strokeWidth={1.5} />
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("rooms.filterGuests")}
            </span>
            <select
              value={guests}
              onChange={(e) => onGuestsChange(Number(e.target.value))}
              className="border border-border bg-background px-3 py-2 text-sm text-navy outline-none focus:border-gold"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4+</option>
            </select>
          </label>

          <div className="flex items-center gap-2 text-sm text-navy">
            <CalendarIcon className="h-4 w-4 text-gold" strokeWidth={1.5} />
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("rooms.filterDates")}
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "min-w-[160px] border border-border bg-background px-3 py-2 text-left text-sm outline-none focus:border-gold",
                    hasRange ? "text-navy" : "text-muted-foreground",
                  )}
                >
                  {fmtRange(range, t("rooms.filterDatesPh"))}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-4">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={range.from ? { from: range.from, to: range.to } : undefined}
                  onSelect={(r) => onRangeChange({ from: r?.from, to: r?.to })}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  locale={ru}
                  className={cn("p-0 pointer-events-auto")}
                />
                {hasRange && (
                  <button
                    type="button"
                    onClick={() => onRangeChange({})}
                    className="mt-3 w-full text-center text-[11px] uppercase tracking-widest text-muted-foreground hover:text-navy"
                  >
                    Сбросить даты
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <button
          type="button"
          onClick={onApply}
          className="bg-navy px-6 py-3 text-[11px] uppercase tracking-widest text-cream hover:bg-gold transition-colors"
        >
          {t("rooms.filterApply")}
        </button>
      </div>
    </div>
  );
}
