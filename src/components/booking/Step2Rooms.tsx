import { useMemo, useState } from "react";
import { ChevronDown, Users, Ruler } from "lucide-react";
import { ROOMS } from "@/data/rooms";
import type { BookingState, MealPlan, SelectedRate } from "./types";
import { BREAKFAST_PER_PERSON, calcTotals, fmtRub, nightsBetween } from "./types";
import { StaySummary } from "./StaySummary";
import { cn } from "@/lib/utils";

type Props = {
  state: BookingState;
  onSelect: (sel: SelectedRate) => void;
  onEditStep: (step: 1 | 2 | 3) => void;
  onContinue: () => void;
};

export function Step2Rooms({ state, onSelect, onEditStep, onContinue }: Props) {
  const nights = nightsBetween(state.dates.from, state.dates.to);
  const guests = state.party.adults + state.party.children;

  const available = useMemo(
    () =>
      ROOMS.filter(
        (r) => r.price_from_rub > 0 && r.max_guests >= guests,
      ),
    [guests],
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px] lg:py-16">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">
          Шаг 02 — Номера и цены
        </p>
        <h1 className="mt-3 text-center font-serif text-4xl text-navy sm:text-5xl">
          Выберите вариант проживания
        </h1>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Все цены указаны в рублях, включают НДС. Найдено: {available.length} номер(ов) на {nights} ноч.
        </p>

        <div className="mt-10 space-y-6">
          {available.map((room) => (
            <RoomBookingCard
              key={room.id}
              room={room}
              nights={nights}
              guests={guests}
              selected={
                state.selected?.room.id === room.id ? state.selected.mealPlan : null
              }
              onPick={(mealPlan) => {
                onSelect({ room, mealPlan });
                onContinue();
              }}
            />
          ))}
        </div>
      </div>

      <StaySummary state={state} onEditStep={onEditStep} />
    </div>
  );
}

function RoomBookingCard({
  room,
  nights,
  guests,
  selected,
  onPick,
}: {
  room: ReturnType<typeof Object> & (typeof ROOMS)[number];
  nights: number;
  guests: number;
  selected: MealPlan | null;
  onPick: (mealPlan: MealPlan) => void;
}) {
  const [open, setOpen] = useState(false);

  const roomOnly = room.price_from_rub * nights;
  const withBreakfast = roomOnly + BREAKFAST_PER_PERSON * guests * nights;

  const cover = room.photos[0];

  return (
    <article className="border border-border bg-card">
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-[280px_1fr]">
        <div className="aspect-[4/3] h-full w-full overflow-hidden bg-cream sm:aspect-auto">
          {cover ? (
            <img src={cover} alt={room.name_ru} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              Фото скоро
            </div>
          )}
        </div>

        <div className="flex flex-col p-6">
          <h3 className="font-serif text-2xl text-navy">{room.name_ru}</h3>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5 text-[#C9A96E]" strokeWidth={1.5} />
              {room.area_sqm} м²
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#C9A96E]" strokeWidth={1.5} />
              до {room.max_guests} мест
            </span>
          </div>

          <p className="mt-3 line-clamp-2 text-sm italic leading-relaxed text-muted-foreground">
            {room.description_ru}
          </p>

          <div className="mt-auto flex items-end justify-between pt-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Начиная с
              </p>
              <p className="font-serif text-2xl text-navy">
                {fmtRub(room.price_from_rub)}{" "}
                <span className="text-sm text-muted-foreground">/ ночь</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-2 border border-[#1a1a1a] px-4 py-2.5 text-[10px] uppercase tracking-[2px] text-[#1a1a1a] transition-colors hover:bg-[#1a1a1a] hover:text-white",
              )}
            >
              {open ? "Скрыть тарифы" : "Показать тарифы"}
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-cream/40 p-6">
          <p className="text-[11px] uppercase tracking-widest text-navy">
            Стандартный тариф
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <RateOption
              label="Только проживание"
              total={roomOnly}
              nights={nights}
              isSelected={selected === "room_only"}
              onPick={() => onPick("room_only")}
            />
            <RateOption
              label="Проживание + завтрак"
              hint={`+ ${BREAKFAST_PER_PERSON} ₽ / чел / день`}
              total={withBreakfast}
              nights={nights}
              isSelected={selected === "breakfast"}
              onPick={() => onPick("breakfast")}
            />
          </div>
        </div>
      )}
    </article>
  );
}

function RateOption({
  label,
  hint,
  total,
  nights,
  isSelected,
  onPick,
}: {
  label: string;
  hint?: string;
  total: number;
  nights: number;
  isSelected: boolean;
  onPick: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border bg-background p-5 transition-colors",
        isSelected ? "border-[#C9A96E] ring-1 ring-[#C9A96E]" : "border-border",
      )}
    >
      <div>
        <p className="text-sm text-navy">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Итого за {nights} ноч.
          </p>
          <p className="font-serif text-xl text-navy">{fmtRub(total)}</p>
        </div>
        <button
          type="button"
          onClick={onPick}
          className="bg-[#1a1a1a] px-5 py-2.5 text-[10px] uppercase tracking-[2px] text-white transition-colors hover:bg-[#C9A96E]"
        >
          Забронировать
        </button>
      </div>
    </div>
  );
}
