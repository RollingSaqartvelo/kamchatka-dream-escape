import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BookingWizard } from "@/components/booking/BookingWizard";

export type BookingSearch = {
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  roomId?: string;
};

export const Route = createFileRoute("/booking")({
  validateSearch: (search: Record<string, unknown>): BookingSearch => ({
    checkIn: typeof search.checkIn === "string" ? search.checkIn : undefined,
    checkOut: typeof search.checkOut === "string" ? search.checkOut : undefined,
    adults:
      search.adults != null && Number(search.adults) > 0
        ? Number(search.adults)
        : undefined,
    roomId: typeof search.roomId === "string" ? search.roomId : undefined,
  }),
  component: BookingPage,
  head: () => ({
    meta: [
      { title: "Бронирование — Отель «Полуостров»" },
      {
        name: "description",
        content:
          "Онлайн-бронирование номеров отеля «Полуостров» на Камчатке. Выбор дат, номера и оплата в четыре простых шага.",
      },
    ],
  }),
});

function BookingPage() {
  const search = Route.useSearch();
  return (
    <SiteLayout>
      <BookingWizard search={search} />
    </SiteLayout>
  );
}
