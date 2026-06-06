import { createFileRoute } from "@tanstack/react-router";
import { sendReminderEmails } from "@/lib/email.functions";

/**
 * Cron-endpoint: отправляет email-напоминания гостям с заездом завтра.
 *
 * Вызывать ежедневно в 10:00 по Камчатке (01:00 UTC).
 * Защищён секретным ключом CRON_SECRET.
 *
 * Пример вызова (cron-job.org или Supabase cron):
 *   GET https://poluostrov-hotel.ru/api/internal/cron-reminders
 *   Header: x-cron-secret: <значение CRON_SECRET>
 */
export const Route = createFileRoute("/api/internal/cron-reminders")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ??
    new URL(request.url).searchParams.get("secret");

  if (!secret || provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await sendReminderEmails();
    return Response.json({ ok: true, sent: result.sent });
  } catch (e) {
    console.error("cron-reminders error:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
