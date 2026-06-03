import { createFileRoute } from "@tanstack/react-router";
import { runTravellineSync } from "@/lib/travelline-sync.functions";

/**
 * Cron-эндпоинт: подтягивает новые/изменённые брони из TravelLine.
 *
 * Вызывать каждые 15 минут (cron-job.org / Supabase cron / CF cron).
 * Защищён CRON_SECRET. Курсор хранится в tl_sync_state — синк забирает только
 * НОВЫЕ модификации, поэтому каждый вызов лёгкий.
 *
 *   GET https://<домен>/api/internal/cron-tl-sync
 *   Header: x-cron-secret: <CRON_SECRET>
 */
export const Route = createFileRoute("/api/internal/cron-tl-sync")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    // Без stay-фильтра: сохраняем все новые брони (будущие заезды тоже).
    const res = await runTravellineSync({});
    return Response.json(res);
  } catch (e) {
    console.error("cron-tl-sync error:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
