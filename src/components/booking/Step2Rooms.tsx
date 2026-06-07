import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Users, Ruler, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ROOMS } from "@/data/rooms";
import { supabase } from "@/integrations/supabase/client";
import { mergeRoomOverride, overridesMap, type RoomOverrideRow } from "@/lib/room-overrides";
import type { BookingState, MealPlan, SelectedRate } from "./types";
import { BREAKFAST_PER_PERSON, fmtRub, nightsBetween } from "./types";
import { StaySummary } from "./StaySummary";
import {
  searchTravellineAvailability,
  searchTravellineAvailabilityBatch,
  ROOM_ID_TO_TL,
  type AvailabilityResult,
} from "@/lib/travelline.functions";
import { cn } from "@/lib/utils";

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Status = "available" | "soldout" | "unknown";

type Props = {
  state: BookingState;
  onSelect: (sel: SelectedRate) => void;
  onEditStep: (step: 1 | 2 | 3) => void;
  onContinue: () => void;
};

export function Step2Rooms({ state, onSelect, onEditStep, onContinue }: Props) {
  const { t } = useTranslation();
  const from = state.dates.from ?? new Date();
  const to = state.dates.to ?? new Date();
  const nights = nightsBetween(from, to);
  const guests = state.party.adults + state.party.children;
  const checkIn = fmtDate(from);
  const checkOut = fmtDate(to);

  // Цены/данные из кабинета (room_overrides) — чтобы в воронке цена совпадала с витриной.
  const [ovMap, setOvMap] = useState<Record<string, RoomOverrideRow>>({});
  useEffect(() => {
    void (async () => {
      const { data } = await (supabase as any).from("room_overrides").select("*");
      setOvMap(overridesMap(data as RoomOverrideRow[]));
    })();
  }, []);

  const candidates = useMemo(
    () =>
      ROOMS.map((r) => mergeRoomOverride(r, ovMap[r.id])).filter(
        (r) => r.price_from_rub > 0 && r.max_guests >= guests,
      ),
    [guests, ovMap],
  );

  // One round-trip checks live availability + price for every candidate room.
  const searchBatch = useServerFn(searchTravellineAvailabilityBatch);
  const availQuery = useQuery({
    queryKey: [
      "tl-avail-batch",
      checkIn,
      checkOut,
      state.party.adults,
      state.party.children,
      candidates.map((r) => r.id).join(","),
    ],
    queryFn: () =>
      searchBatch({
        data: {
          roomIds: candidates.map((r) => r.id),
          checkIn,
          checkOut,
          adults: state.party.adults,
          children: state.party.children,
          mealPlan: "room_only",
        },
      }),
    enabled: nights > 0 && candidates.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const availMap = useMemo(() => {
    const m = new Map<string, AvailabilityResult>();
    if (availQuery.data?.ok) for (const r of availQuery.data.results) m.set(r.roomId, r);
    return m;
  }, [availQuery.data]);

  const loading = availQuery.isLoading && availQuery.fetchStatus !== "idle";
  // Hard API failure (auth/network) → don't block booking, fall back to catalogue.
  const apiFailed = availQuery.isError || availQuery.data?.ok === false;
  const checked = Boolean(availQuery.data?.ok) && !loading;

  function statusFor(roomId: string): { status: Status; livePrice: number | null } {
    if (!checked || apiFailed) return { status: "unknown", livePrice: null };
    const r = availMap.get(roomId);
    if (!r) return { status: "unknown", livePrice: null };
    if (r.available) return { status: "available", livePrice: r.totalPrice };
    if (r.error) return { status: "unknown", livePrice: null }; // mapping/API issue → don't mark sold out
    return { status: "soldout", livePrice: null };
  }

  const bookable = candidates.filter((r) => statusFor(r.id).status !== "soldout");
  const soldout = candidates.filter((r) => statusFor(r.id).status === "soldout");

  const heading = loading
    ? t("booking.step2.checking")
    : checked && !apiFailed
      ? t("booking.step2.freeOf", { n: bookable.length, total: candidates.length, nights })
      : t("booking.step2.approx", { n: candidates.length, nights });

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px] lg:py-16">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">
          {t("booking.step2.eyebrow")}
        </p>
        <h1 className="mt-3 text-center font-serif text-4xl text-navy sm:text-5xl">
          {t("booking.step2.title")}
        </h1>
        <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C9A96E]" />}
          {heading}
        </p>

        <div className="mt-10 space-y-6">
          {bookable.map((room) => {
            const { status, livePrice } = statusFor(room.id);
            return (
              <RoomBookingCard
                key={room.id}
                room={room}
                status={status}
                livePrice={livePrice}
                nights={nights}
                guests={guests}
                adults={state.party.adults}
                children={state.party.children}
                checkIn={checkIn}
                checkOut={checkOut}
                selected={
                  state.selected?.room.id === room.id ? state.selected.mealPlan : null
                }
                onPick={(mealPlan) => {
                  onSelect({ room, mealPlan });
                  onContinue();
                }}
              />
            );
          })}
        </div>

        {soldout.length > 0 && (
          <div className="mt-12">
            <p className="border-t border-border pt-6 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("booking.step2.soldOutTitle")}
            </p>
            <div className="mt-6 space-y-6">
              {soldout.map((room) => (
                <RoomBookingCard
                  key={room.id}
                  room={room}
                  status="soldout"
                  livePrice={null}
                  nights={nights}
                  guests={guests}
                  adults={state.party.adults}
                  children={state.party.children}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  selected={null}
                  onPick={() => {}}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <StaySummary state={state} onEditStep={onEditStep} />
    </div>
  );
}

function RoomBookingCard({
  room,
  status,
  livePrice,
  nights,
  guests,
  adults,
  children,
  checkIn,
  checkOut,
  selected,
  onPick,
}: {
  room: (typeof ROOMS)[number];
  status: Status;
  livePrice: number | null;
  nights: number;
  guests: number;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  selected: MealPlan | null;
  onPick: (mealPlan: MealPlan) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const searchTL = useServerFn(searchTravellineAvailability);
  const hasMapping = Boolean(ROOM_ID_TO_TL[room.id]);
  const soldOut = status === "soldout";

  // Breakfast price is fetched lazily on expand; room-only comes from the batch.
  const tlBreakfast = useQuery({
    queryKey: ["tl-price", room.id, checkIn, checkOut, adults, children, "breakfast"],
    queryFn: () =>
      searchTL({
        data: { roomId: room.id, checkIn, checkOut, adults, children, mealPlan: "breakfast" },
      }),
    enabled: open && hasMapping && !soldOut,
    staleTime: 5 * 60 * 1000,
  });

  const fallbackRoomOnly = room.price_from_rub * nights;
  const fallbackBreakfast = fallbackRoomOnly + BREAKFAST_PER_PERSON * guests * nights;

  const roomOnly = livePrice ?? fallbackRoomOnly;
  const withBreakfast = tlBreakfast.data?.totalPrice ?? roomOnly + BREAKFAST_PER_PERSON * guests * nights;

  const cover = room.photos[0];

  return (
    <article
      className={cn(
        "border border-border bg-card transition-opacity",
        soldOut && "opacity-60",
      )}
    >
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-[280px_1fr]">
        <div className="relative aspect-[4/3] h-full w-full overflow-hidden bg-cream sm:aspect-auto">
          {cover ? (
            <img
              src={cover}
              alt={room.name_ru}
              loading="lazy"
              decoding="async"
              className={cn("h-full w-full object-cover", soldOut && "grayscale")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              {t("booking.step2.photoSoon")}
            </div>
          )}
          {soldOut && (
            <span className="absolute left-3 top-3 bg-navy/85 px-3 py-1 text-[10px] uppercase tracking-widest text-cream">
              {t("booking.step2.soldOutBadge")}
            </span>
          )}
        </div>

        <div className="flex flex-col p-6">
          <h3 className="font-serif text-2xl text-navy">{room.name_ru}</h3>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5 text-[#C9A96E]" strokeWidth={1.5} />
              {t("booking.step2.area", { n: room.area_sqm })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#C9A96E]" strokeWidth={1.5} />
              {t("booking.step2.seats", { n: room.max_guests })}
            </span>
          </div>

          <p className="mt-3 line-clamp-2 text-sm italic leading-relaxed text-muted-foreground">
            {room.description_ru}
          </p>

          <div className="mt-auto flex items-end justify-between pt-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {livePrice ? t("booking.step2.totalFor", { n: nights }) : t("booking.step2.startingAt")}
              </p>
              <p className="font-serif text-2xl text-navy">
                {livePrice ? (
                  <>
                    {fmtRub(livePrice)}{" "}
                    <span className="text-xs uppercase tracking-widest text-emerald-600">live</span>
                  </>
                ) : (
                  <>
                    {fmtRub(room.price_from_rub)}{" "}
                    <span className="text-sm text-muted-foreground">{t("booking.step2.perNight")}</span>
                  </>
                )}
              </p>
            </div>
            {soldOut ? (
              <span className="px-4 py-2.5 text-[10px] uppercase tracking-[2px] text-muted-foreground">
                {t("booking.step2.soldOutBtn")}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-2 border border-[#1a1a1a] px-4 py-2.5 text-[10px] uppercase tracking-[2px] text-[#1a1a1a] transition-colors hover:bg-[#1a1a1a] hover:text-white",
                )}
              >
                {open ? t("booking.step2.hideRates") : t("booking.step2.showRates")}
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                  strokeWidth={2}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {open && !soldOut && (
        <div className="border-t border-border bg-cream/40 p-6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-widest text-navy">{t("booking.step2.ratesShort")}</p>
            {tlBreakfast.isFetching && (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> {t("booking.step2.loadingPrices")}
              </span>
            )}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <RateOption
              label={t("booking.step2.roomOnly")}
              total={roomOnly}
              nights={nights}
              isLive={!!livePrice}
              isSelected={selected === "room_only"}
              onPick={() => onPick("room_only")}
            />
            <RateOption
              label={t("booking.step2.roomBreakfast")}
              hint={tlBreakfast.data?.totalPrice ? undefined : t("booking.step2.breakfastHint", { p: BREAKFAST_PER_PERSON })}
              total={withBreakfast}
              nights={nights}
              isLive={!!tlBreakfast.data?.totalPrice}
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
  isLive,
  isSelected,
  onPick,
}: {
  label: string;
  hint?: string;
  total: number;
  nights: number;
  isLive?: boolean;
  isSelected: boolean;
  onPick: () => void;
}) {
  const { t } = useTranslation();
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
            {t("booking.step2.totalFor", { n: nights })}{isLive ? t("booking.step2.live") : ""}
          </p>
          <p className="font-serif text-xl text-navy">{fmtRub(total)}</p>
        </div>
        <button
          type="button"
          onClick={onPick}
          className="bg-[#1a1a1a] px-5 py-2.5 text-[10px] uppercase tracking-[2px] text-white transition-colors hover:bg-[#C9A96E]"
        >
          {t("booking.step2.book")}
        </button>
      </div>
    </div>
  );
}
