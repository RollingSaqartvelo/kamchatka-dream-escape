import { useTranslation } from "react-i18next";
import { Users, Calendar } from "lucide-react";

type Props = {
  guests: number;
  onGuestsChange: (n: number) => void;
  dates: string;
  onDatesChange: (s: string) => void;
  onApply: () => void;
};

export function RoomFilterBar({
  guests,
  onGuestsChange,
  dates,
  onDatesChange,
  onApply,
}: Props) {
  const { t } = useTranslation();
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

          <label className="flex items-center gap-2 text-sm text-navy">
            <Calendar className="h-4 w-4 text-gold" strokeWidth={1.5} />
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("rooms.filterDates")}
            </span>
            <input
              type="text"
              value={dates}
              onChange={(e) => onDatesChange(e.target.value)}
              placeholder={t("rooms.filterDatesPh")}
              className="border border-border bg-background px-3 py-2 text-sm text-navy outline-none focus:border-gold"
            />
          </label>
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
