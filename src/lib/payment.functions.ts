import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * Публичная выборка брони по id + email — для страницы оплаты.
 * Email служит "токеном" доступа к чужой брони (RLS закрывает SELECT для anon).
 */
export const getPublicBooking = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      email: z.string().trim().email().max(255),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = adminClient();
    const { data: row, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_number, first_name, last_name, email, room_name, check_in, check_out, nights, adults, children, meal_plan, total_price, prepayment_amount, remaining_amount, payment_status, payment_provider_method",
      )
      .eq("id", data.id)
      .ilike("email", data.email)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) throw new Error("Бронь не найдена");
    return row;
  });

/**
 * Создаёт платёж в Альфа-Банке (или возвращает мок, если ключи не настроены).
 *
 * Возвращает { paymentUrl, orderId, mode }.
 * В режиме mock paymentUrl ведёт сразу на /booking/success (для отладки UX без реального API).
 */
export const createAlfaPayment = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      booking_id: z.string().uuid(),
      email: z.string().trim().email().max(255),
      method: z.enum(["card", "sbp", "invoice"]),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = adminClient();

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, booking_number, email, prepayment_amount, payment_status")
      .eq("id", data.booking_id)
      .ilike("email", data.email)
      .maybeSingle();

    if (bErr) throw new Error(bErr.message);
    if (!booking) throw new Error("Бронь не найдена");

    // Способ "по счёту" — менеджер отправляет реквизиты, онлайн-оплаты нет
    if (data.method === "invoice") {
      await supabase
        .from("bookings")
        .update({
          payment_provider_method: "invoice",
          payment_status: "awaiting_invoice",
        })
        .eq("id", booking.id);
      return {
        mode: "invoice" as const,
        paymentUrl: `/booking/success?n=${encodeURIComponent(booking.booking_number)}&e=${encodeURIComponent(booking.email)}&m=invoice`,
        orderId: null,
      };
    }

    const apiUrl = process.env.ALFA_API_URL;
    const login =
      data.method === "sbp"
        ? process.env.ALFA_SBP_MERCHANT_LOGIN
        : process.env.ALFA_MERCHANT_LOGIN;
    const password =
      data.method === "sbp"
        ? process.env.ALFA_SBP_MERCHANT_PASSWORD
        : process.env.ALFA_MERCHANT_PASSWORD;

    const origin =
      process.env.PUBLIC_APP_URL ??
      process.env.VITE_PUBLIC_APP_URL ??
      "https://poluostrov-hotel.ru";

    // Если ключи не настроены — мок: имитируем платёж и возвращаем success
    if (!apiUrl || !login || !password) {
      const mockOrderId = `MOCK-${Date.now()}`;
      await supabase
        .from("bookings")
        .update({
          alfa_order_id: mockOrderId,
          payment_provider_method: data.method,
          payment_status: "awaiting_payment",
        })
        .eq("id", booking.id);
      return {
        mode: "mock" as const,
        paymentUrl: `${origin}/booking/success?n=${encodeURIComponent(booking.booking_number)}&e=${encodeURIComponent(booking.email)}&m=${data.method}&mock=1`,
        orderId: mockOrderId,
      };
    }

    // Реальный вызов Альфы — register.do (одностадийная оплата)
    const params = new URLSearchParams({
      userName: login,
      password,
      orderNumber: `${booking.booking_number}-${Date.now().toString(36)}`,
      amount: String(booking.prepayment_amount * 100), // в копейках
      currency: "643", // RUB
      returnUrl: `${origin}/booking/success?n=${booking.booking_number}&e=${encodeURIComponent(booking.email)}`,
      failUrl: `${origin}/booking/pay/${booking.id}?failed=1`,
      description: `Предоплата брони ${booking.booking_number}`,
      jsonParams: JSON.stringify({ booking_id: booking.id }),
    });

    const res = await fetch(`${apiUrl.replace(/\/$/, "")}/register.do`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`Alfa API HTTP ${res.status}`);
    }

    const json = (await res.json()) as {
      orderId?: string;
      formUrl?: string;
      errorCode?: string;
      errorMessage?: string;
    };

    if (json.errorCode && json.errorCode !== "0") {
      throw new Error(json.errorMessage ?? `Alfa error ${json.errorCode}`);
    }
    if (!json.orderId || !json.formUrl) {
      throw new Error("Некорректный ответ Альфа-Банка");
    }

    await supabase
      .from("bookings")
      .update({
        alfa_order_id: json.orderId,
        payment_provider_method: data.method,
        payment_status: "awaiting_payment",
      })
      .eq("id", booking.id);

    return {
      mode: "live" as const,
      paymentUrl: json.formUrl,
      orderId: json.orderId,
    };
  });
