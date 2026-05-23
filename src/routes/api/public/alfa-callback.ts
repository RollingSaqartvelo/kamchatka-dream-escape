import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

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
    const { error } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("alfa_order_id", mdOrder);
    if (error) {
      console.error("alfa-callback update error:", error);
      return new Response("db error", { status: 500 });
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
