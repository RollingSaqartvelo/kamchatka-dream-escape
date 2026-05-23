import { createFileRoute } from "@tanstack/react-router";
import { searchTravellineAvailability } from "@/lib/travelline.functions";

/**
 * Тестовый эндпоинт для проверки интеграции с Travelline.
 *
 * Примеры:
 *   /api/public/travelline-test
 *   /api/public/travelline-test?roomId=dvuhmestnyy-standart&checkIn=2026-06-10&checkOut=2026-06-12&adults=2&meal=breakfast
 */
export const Route = createFileRoute("/api/public/travelline-test")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const today = new Date();
        const inDate = new Date(today.getTime() + 14 * 86400_000);
        const outDate = new Date(today.getTime() + 16 * 86400_000);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);

        const roomId = url.searchParams.get("roomId") ?? "dvuhmestnyy-standart";
        const checkIn = url.searchParams.get("checkIn") ?? fmt(inDate);
        const checkOut = url.searchParams.get("checkOut") ?? fmt(outDate);
        const adults = Number(url.searchParams.get("adults") ?? "2");
        const children = Number(url.searchParams.get("children") ?? "0");
        const meal =
          (url.searchParams.get("meal") as "room_only" | "breakfast") ??
          "room_only";

        const started = Date.now();
        try {
          const result = await searchTravellineAvailability({
            data: { roomId, checkIn, checkOut, adults, children, mealPlan: meal },
          });
          return Response.json(
            {
              ok: true,
              ms: Date.now() - started,
              request: { roomId, checkIn, checkOut, adults, children, meal },
              result,
            },
            { status: 200 },
          );
        } catch (e) {
          return Response.json(
            {
              ok: false,
              ms: Date.now() - started,
              error: e instanceof Error ? e.message : String(e),
              request: { roomId, checkIn, checkOut, adults, children, meal },
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
