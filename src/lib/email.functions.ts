import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

// ─── HTML шаблоны ────────────────────────────────────────────────────────────

const BASE_STYLE = `
  font-family: 'Georgia', serif;
  background: #f5f2ee;
  margin: 0; padding: 0;
`;

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);">
    <!-- Шапка -->
    <div style="background:#1a1a2e;padding:32px 40px;text-align:center;">
      <p style="color:#C9A96E;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">ГОСТИНИЦА</p>
      <h1 style="color:#fff;font-family:Georgia,serif;font-size:28px;margin:0;font-weight:400;">ПОЛУОСТРОВ</h1>
      <p style="color:#888;font-size:11px;margin:8px 0 0;letter-spacing:1px;">Петропавловск-Камчатский</p>
    </div>
    <!-- Контент -->
    <div style="padding:40px;">
      ${content}
    </div>
    <!-- Подвал -->
    <div style="background:#f5f2ee;padding:24px 40px;text-align:center;border-top:1px solid #e8e4de;">
      <p style="color:#888;font-size:12px;margin:0 0 4px;">Гостиница «Полуостров» · ул. Абеля, 41, Петропавловск-Камчатский</p>
      <p style="color:#888;font-size:12px;margin:0;">
        <a href="tel:+79149945757" style="color:#C9A96E;text-decoration:none;">+7 (914) 994-57-57</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function bookingConfirmationHtml(b: {
  booking_number: string;
  first_name: string;
  last_name: string;
  room_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  meal_plan: string;
  total_price: number;
  prepayment_amount?: number;
}): string {
  const mealLabel = b.meal_plan === "breakfast" ? "Завтрак включён" : "Без питания";
  const fmt = (d: string) => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  return emailWrapper(`
    <p style="color:#C9A96E;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">Подтверждение бронирования</p>
    <h2 style="color:#1a1a2e;font-size:24px;margin:0 0 24px;font-weight:400;">
      ${b.last_name} ${b.first_name}, ваш номер забронирован!
    </h2>
    <p style="color:#666;font-size:14px;line-height:1.7;margin:0 0 32px;">
      Рады приветствовать вас в гостинице «Полуостров». Ваше бронирование подтверждено —
      ждём вас на краю земли!
    </p>

    <!-- Детали брони -->
    <div style="background:#f9f7f4;border-radius:4px;padding:24px;margin-bottom:32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#999;font-size:13px;width:45%;">Номер брони</td>
          <td style="padding:8px 0;color:#1a1a2e;font-size:13px;font-weight:bold;font-family:monospace;">${b.booking_number}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#999;font-size:13px;border-top:1px solid #e8e4de;">Номер</td>
          <td style="padding:8px 0;color:#1a1a2e;font-size:13px;border-top:1px solid #e8e4de;">${b.room_name}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#999;font-size:13px;border-top:1px solid #e8e4de;">Заезд</td>
          <td style="padding:8px 0;color:#1a1a2e;font-size:13px;border-top:1px solid #e8e4de;">${fmt(b.check_in)}, с 14:00</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#999;font-size:13px;border-top:1px solid #e8e4de;">Выезд</td>
          <td style="padding:8px 0;color:#1a1a2e;font-size:13px;border-top:1px solid #e8e4de;">${fmt(b.check_out)}, до 12:00</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#999;font-size:13px;border-top:1px solid #e8e4de;">Ночей</td>
          <td style="padding:8px 0;color:#1a1a2e;font-size:13px;border-top:1px solid #e8e4de;">${b.nights}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#999;font-size:13px;border-top:1px solid #e8e4de;">Гостей</td>
          <td style="padding:8px 0;color:#1a1a2e;font-size:13px;border-top:1px solid #e8e4de;">${b.adults} взр.${b.children ? ` + ${b.children} реб.` : ""}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#999;font-size:13px;border-top:1px solid #e8e4de;">Питание</td>
          <td style="padding:8px 0;color:#1a1a2e;font-size:13px;border-top:1px solid #e8e4de;">${mealLabel}</td>
        </tr>
        <tr>
          <td style="padding:12px 0 8px;color:#1a1a2e;font-size:15px;font-weight:bold;border-top:2px solid #C9A96E;">Итого</td>
          <td style="padding:12px 0 8px;color:#C9A96E;font-size:18px;font-weight:bold;border-top:2px solid #C9A96E;">₽ ${new Intl.NumberFormat("ru-RU").format(b.total_price)}</td>
        </tr>
      </table>
    </div>

    <p style="color:#666;font-size:13px;line-height:1.7;">
      Если у вас возникнут вопросы или вам потребуется трансфер — пишите нам в Telegram или звоните:
      <strong>+7 (914) 994-57-57</strong>
    </p>
  `);
}

export function paymentConfirmationHtml(b: {
  booking_number: string;
  first_name: string;
  last_name: string;
  room_name: string;
  check_in: string;
  total_price: number;
  paid_at?: string;
}): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  return emailWrapper(`
    <p style="color:#C9A96E;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">Оплата подтверждена</p>
    <h2 style="color:#1a1a2e;font-size:24px;margin:0 0 24px;font-weight:400;">
      ✓ Оплата получена
    </h2>
    <p style="color:#666;font-size:14px;line-height:1.7;margin:0 0 32px;">
      ${b.last_name} ${b.first_name}, ваш платёж успешно обработан. До встречи в гостинице!
    </p>

    <div style="background:#f0faf5;border-left:4px solid #22c55e;border-radius:4px;padding:20px 24px;margin-bottom:32px;">
      <p style="margin:0 0 8px;color:#166534;font-size:14px;font-weight:bold;">Бронирование оплачено</p>
      <p style="margin:0;color:#166534;font-size:13px;">
        ${b.booking_number} · ${b.room_name} · заезд ${fmt(b.check_in)}
      </p>
      <p style="margin:8px 0 0;color:#166534;font-size:18px;font-weight:bold;">
        ₽ ${new Intl.NumberFormat("ru-RU").format(b.total_price)}
      </p>
    </div>

    <p style="color:#666;font-size:13px;line-height:1.7;">
      Ждём вас! Если нужен трансфер из аэропорта — сообщите заранее по номеру
      <strong>+7 (914) 994-57-57</strong>.
    </p>
  `);
}

export function reminderHtml(b: {
  booking_number: string;
  first_name: string;
  last_name: string;
  room_name: string;
  check_in: string;
  check_out: string;
}): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  return emailWrapper(`
    <p style="color:#C9A96E;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">Напоминание о заезде</p>
    <h2 style="color:#1a1a2e;font-size:24px;margin:0 0 24px;font-weight:400;">
      Завтра ваш заезд!
    </h2>
    <p style="color:#666;font-size:14px;line-height:1.7;margin:0 0 32px;">
      ${b.last_name} ${b.first_name}, напоминаем — завтра, ${fmt(b.check_in)},
      вас ждёт гостиница «Полуостров». Заезд с 14:00.
    </p>

    <div style="background:#f9f7f4;border-radius:4px;padding:24px;margin-bottom:32px;">
      <p style="margin:0 0 8px;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Детали заезда</p>
      <p style="margin:0 0 4px;color:#1a1a2e;font-size:14px;"><strong>${b.room_name}</strong></p>
      <p style="margin:0 0 4px;color:#666;font-size:13px;">Заезд: ${fmt(b.check_in)}, с 14:00</p>
      <p style="margin:0;color:#666;font-size:13px;">Выезд: ${fmt(b.check_out)}, до 12:00</p>
    </div>

    <p style="color:#666;font-size:13px;line-height:1.7;">
      Нужен трансфер или есть вопросы? Пишите нам — мы на связи:<br>
      📞 <strong>+7 (914) 994-57-57</strong><br>
      ✈️ Аэропорт Петропавловск-Камчатский (PKC) ~30 мин на такси
    </p>
  `);
}

// ─── Server function: отправить письмо через Resend ──────────────────────────

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  html: z.string(),
});

async function sendViaResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set — email not sent");
    return { ok: false, error: "no_api_key" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Гостиница Полуостров <no-reply@poluostrov-hotel.ru>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("Resend error:", res.status, txt.slice(0, 200));
    return { ok: false, error: `resend_${res.status}` };
  }
  return { ok: true };
}

// ─── Отправить подтверждение брони ───────────────────────────────────────────

export async function sendBookingConfirmation(bookingId: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: b } = await supabase
    .from("bookings")
    .select("booking_number,first_name,last_name,email,room_name,check_in,check_out,nights,adults,children,meal_plan,total_price,prepayment_amount")
    .eq("id", bookingId)
    .single();

  if (!b?.email) return;

  const html = bookingConfirmationHtml(b);
  await sendViaResend(
    b.email,
    `Бронирование подтверждено — ${b.booking_number} · Гостиница Полуостров`,
    html,
  );
}

// ─── Отправить подтверждение оплаты ──────────────────────────────────────────

export async function sendPaymentConfirmation(bookingId: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: b } = await supabase
    .from("bookings")
    .select("booking_number,first_name,last_name,email,room_name,check_in,total_price,paid_at")
    .eq("id", bookingId)
    .single();

  if (!b?.email) return;

  const html = paymentConfirmationHtml(b);
  await sendViaResend(
    b.email,
    `Оплата подтверждена — ${b.booking_number} · Гостиница Полуостров`,
    html,
  );
}

// ─── Отправить напоминание (вызывается из cron) ───────────────────────────────

export async function sendReminderEmails() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id,booking_number,first_name,last_name,email,room_name,check_in,check_out")
    .eq("check_in", tomorrowStr)
    .in("payment_status", ["confirmed", "paid"]);

  if (!bookings?.length) return { sent: 0 };

  let sent = 0;
  for (const b of bookings) {
    if (!b.email) continue;
    const html = reminderHtml(b);
    const result = await sendViaResend(
      b.email,
      `Напоминание: завтра ваш заезд в гостиницу Полуостров`,
      html,
    );
    if (result.ok) sent++;
  }
  return { sent };
}
