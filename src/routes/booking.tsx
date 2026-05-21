import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BookingWizard } from "@/components/booking/BookingWizard";

export const Route = createFileRoute("/booking")({
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
  return (
    <SiteLayout>
      <BookingWizard />
    </SiteLayout>
  );
}
