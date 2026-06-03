import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { sendPaymentConfirmation } from "@/lib/email.functions";
import { notifyPaymentReceived } from "@/lib/telegram.functions";
import { pushBookingToTravelline } from "@/lib/travelline-booking.functions";

/**
 * Webhook от Альфа-Банка после оплаты.
 *
 * Альфа дёргает GET с параметрами:
 *   mdOrder        — orderId платежа
 *   orderNumber    — наш orderNumber
 *   operation      — deposited | approved | declinedByTimeout | refunded | reversed
 *   status         — 0/1
 *   checksum       — HMAC по отсортированным параметрам (нужен secret token из ЛК Альфы)
 *
 * Проверка подписи и точная схема параметров уточняются в договоре с банком —
 * сейчас заготовка фиксирует факт оплаты по mdOrder + operation=deposited.
 */
export const Route = createFileRoute("/api/public/alfa-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request) {
  const url = new URL(request.url);
  const params =
    request.method === "POST"
      ? Object.fromEntries(new URLSearchParams(await request.text()))
      : Object.fromEntries(url.searchParams);

  const mdOrder = params.mdOrder ?? params.orderId;
  const operation = params.operation;
  const status = params.status;

  if (!mdOrder) {
    return new Response("missing orderId", { status: 400 });
  }

  // TODO: проверка checksum/HMAC после получения секрета от Альфы
  // const valid = verifyAlfaSignature(params, process.env.ALFA_CALLBACK_SECRET!)
  // if (!valid) return new Response('invalid signature', { status: 401 })

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // deposited = успешная оплата
  if (operation === "deposited" && status === "1") {
    const { data: updated, error } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("alfa_order_id", mdOrder)
      .select("id")
      .single();
    if (error) {
      console.error("alfa-callback update error:", error);
      return new Response("db error", { status: 500 });
    }
    if (updated?.id) {
      // Email + Telegram при успешной оплате (fire-and-forget)
      sendPaymentConfirmation(updated.id).catch((e) =>
        console.error("sendPaymentConfirmation failed:", e),
      );
      // Получаем детали брони для Telegram
      const { data: bk } = await supabase
        .from("bookings")
        .select("booking_number,first_name,last_name,room_name,check_in,total_price")
        .eq("id", updated.id)
        .single();
      if (bk) {
        notifyPaymentReceived(bk).catch((e) =>
          console.error("notifyPaymentReceived failed:", e),
        );
      }
      // Пай-фёрст: после оплаты отправляем бронь в TravelLine (закрывает наличие
      // на всех каналах). Включается флагом TL_PUSH_ENABLED=1 после валидации.
      if (process.env.TL_PUSH_ENABLED === "1") {
        pushBookingToTravelline(updated.id)
          .then((r) => { if (!r.ok) console.error("TL push (pay) failed:", r.error, r.log); })
          .catch((e) => console.error("TL push (pay) exception:", e));
      }
    }
    return new Response("ok");
  }

  if (
    operation === "declinedByTimeout" ||
    operation === "reversed" ||
    status === "0"
  ) {
    await supabase
      .from("bookings")
      .update({ payment_status: "payment_failed" })
      .eq("alfa_order_id", mdOrder);
    return new Response("ok");
  }

  if (operation === "refunded") {
    await supabase
      .from("bookings")
      .update({ payment_status: "refunded" })
      .eq("alfa_order_id", mdOrder);
    return new Response("ok");
  }

  return new Response("ok");
}
