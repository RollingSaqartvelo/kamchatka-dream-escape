import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ROOMS } from "@/data/rooms";
import { RoomCard } from "@/components/rooms/RoomCard";
import { RoomFilterBar } from "@/components/rooms/RoomFilterBar";


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
  const [guests, setGuests] = useState(2);
  const [dates, setDates] = useState("");
  const [filterActive, setFilterActive] = useState(false);

  const rooms = useMemo(() => {
    if (!filterActive) return ROOMS;
    return ROOMS.filter((r) => r.max_guests >= guests);
  }, [filterActive, guests]);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[420px] w-full overflow-hidden bg-navy">
        <img
          src={heroImg}
          alt="Номера отеля «Полуостров»"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-navy/40" />
        <div className="relative z-10 flex h-full items-center justify-center px-4 text-center">
          <div>
            <p className="mb-4 text-[11px] uppercase tracking-[0.4em] text-gold">
              01 — Stay
            </p>
            <h1 className="font-serif text-5xl text-cream sm:text-[56px]">
              Номера и цены
            </h1>
            <p className="mt-4 font-serif text-lg italic text-cream/85 sm:text-xl">
              Выберите ваш идеальный номер
            </p>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <RoomFilterBar
        guests={guests}
        onGuestsChange={setGuests}
        dates={dates}
        onDatesChange={setDates}
        onApply={() => setFilterActive(true)}
      />

      {/* Rooms grid */}
      <section className="bg-light-gray py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {rooms.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              Нет номеров, подходящих под выбранные параметры.
            </p>
          ) : (
            <div className="grid gap-8">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}

          <p className="mt-12 text-center text-xs uppercase tracking-widest text-muted-foreground">
            Скоро здесь появятся ещё 10 категорий номеров
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
