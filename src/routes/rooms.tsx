import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ROOMS, type Room } from "@/data/rooms";
import { RoomCard } from "@/components/rooms/RoomCard";
import { RoomFilterBar } from "@/components/rooms/RoomFilterBar";
import { supabase } from "@/integrations/supabase/client";
import { customRoomToRoom, type CustomRoomRow } from "@/lib/custom-rooms";
import type { DateRange } from "@/components/booking/types";


export const Route = createFileRoute("/rooms")({
  component: RoomsPage,
  head: () => ({
    meta: [
      { title: "Номера | Отель Полуостров Петропавловск-Камчатский" },
      {
        name: "description",
        content:
          "11 видов номеров от 4400 ₽/ночь. Комфортное размещение в центре Петропавловска-Камчатского. Онлайн бронирование.",
      },
      { property: "og:title", content: "Номера — Отель «Полуостров»" },
      {
        property: "og:description",
        content:
          "11 видов номеров от 4400 ₽/ночь. Онлайн бронирование. Петропавловск-Камчатский.",
      },
    ],
  }),
});

function RoomsPage() {
  const { t } = useTranslation();
  const [guests, setGuests] = useState(2);
  const [range, setRange] = useState<DateRange>({});
  const [filterActive, setFilterActive] = useState(false);
  const [customRooms, setCustomRooms] = useState<Room[]>([]);

  // Добавленные в кабинете номера (опубликованные, с фото) — в конец списка.
  useEffect(() => {
    void (async () => {
      const { data } = await (supabase as any)
        .from("custom_rooms")
        .select("*")
        .eq("published", true)
        .order("sort_order")
        .order("created_at");
      const rows = ((data as CustomRoomRow[]) ?? []).filter((c) => (c.photos ?? []).length > 0);
      setCustomRooms(rows.map(customRoomToRoom));
    })();
  }, []);

  const allRooms = useMemo(() => [...ROOMS, ...customRooms], [customRooms]);

  const rooms = useMemo(() => {
    if (!filterActive) return allRooms;
    return allRooms.filter((r) => r.max_guests >= guests);
  }, [filterActive, guests, allRooms]);

  // Carry the chosen dates + party into the booking wizard via search params.
  const bookingSearch = useMemo(
    () => ({
      adults: guests,
      ...(range.from ? { checkIn: range.from.toISOString().slice(0, 10) } : {}),
      ...(range.to ? { checkOut: range.to.toISOString().slice(0, 10) } : {}),
    }),
    [guests, range.from, range.to],
  );

  return (
    <SiteLayout>
      <section className="relative h-[60vh] min-h-[420px] w-full overflow-hidden bg-navy">
        <video
          src="/media/rooms-hero.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-navy/40" />
        <div className="relative z-10 flex h-full items-center justify-center px-4 text-center">
          <div>
            <p className="mb-4 text-[11px] uppercase tracking-[0.4em] text-gold">
              {t("rooms.heroEyebrow")}
            </p>
            <h1 className="font-serif text-5xl text-cream sm:text-[56px]">
              {t("rooms.heroTitle")}
            </h1>
            <p className="mt-4 font-serif text-lg italic text-cream/85 sm:text-xl">
              {t("rooms.heroSub")}
            </p>
          </div>
        </div>
      </section>

      <RoomFilterBar
        guests={guests}
        onGuestsChange={setGuests}
        range={range}
        onRangeChange={setRange}
        onApply={() => setFilterActive(true)}
      />

      <section className="bg-light-gray py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {rooms.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              {t("rooms.noResults")}
            </p>
          ) : (
          <div className="grid gap-8">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} bookingSearch={bookingSearch} />
            ))}
          </div>
        )}
      </div>
    </section>
  </SiteLayout>
);
}
