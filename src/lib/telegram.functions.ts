// Telegram-уведомления администратору гостиницы

const TG_API = "https://api.telegram.org";

function botUrl(method: string): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");
  return `${TG_API}/bot${token}/${method}`;
}

async function sendMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = chatId || process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !adminChatId) {
    console.warn("Telegram not configured: TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID missing");
    return false;
  }
  try {
    const res = await fetch(`${TG_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: "HTML",
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("Telegram sendMessage error:", res.status, txt.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("Telegram sendMessage exception:", e);
    return false;
  }
}

// ─── Уведомление о новой брони ────────────────────────────────────────────────

export async function notifyNewBooking(b: {
  booking_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  room_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  meal_plan: string;
  total_price: number;
  prepayment_amount: number;
  source?: string;
}) {
  const meal = b.meal_plan === "breakfast" ? "Завтрак ✓" : "Без питания";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const guests = b.adults + (b.children ? ` + ${b.children} дет.` : "");
  const price = new Intl.NumberFormat("ru-RU").format(b.total_price);
  const prepay = new Intl.NumberFormat("ru-RU").format(b.prepayment_amount);

  const text = [
    `🏨 <b>НОВАЯ БРОНЬ</b> — ${b.booking_number}`,
    ``,
    `👤 <b>${b.last_name} ${b.first_name}</b>`,
    `📞 ${b.phone}`,
    `✉️ ${b.email}`,
    ``,
    `🛏 ${b.room_name}`,
    `📅 ${fmt(b.check_in)} → ${fmt(b.check_out)} (${b.nights} ноч.)`,
    `👥 ${guests} гост.  •  ${meal}`,
    ``,
    `💰 Итого: <b>₽ ${price}</b>`,
    `💳 Предоплата: ₽ ${prepay}`,
    ``,
    `🔗 <a href="https://poluostrov-hotel.ru/admin/calendar">Открыть календарь</a>`,
  ].join("\n");

  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID ?? "";
  return sendMessage(chatId, text);
}

// ─── Уведомление об оплате ────────────────────────────────────────────────────

export async function notifyPaymentReceived(b: {
  booking_number: string;
  first_name: string;
  last_name: string;
  room_name: string;
  check_in: string;
  total_price: number;
}) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const price = new Intl.NumberFormat("ru-RU").format(b.total_price);

  const text = [
    `✅ <b>ОПЛАТА ПОЛУЧЕНА</b> — ${b.booking_number}`,
    ``,
    `👤 ${b.last_name} ${b.first_name}`,
    `🛏 ${b.room_name}  •  заезд ${fmt(b.check_in)}`,
    `💰 <b>₽ ${price}</b>`,
    ``,
    `🔗 <a href="https://poluostrov-hotel.ru/admin/calendar">Открыть календарь</a>`,
  ].join("\n");

  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID ?? "";
  return sendMessage(chatId, text);
}

// ─── Уведомление об отмене ────────────────────────────────────────────────────

export async function notifyCancellation(b: {
  booking_number: string;
  first_name: string;
  last_name: string;
  room_name: string;
  check_in: string;
}) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  const text = [
    `❌ <b>ОТМЕНА БРОНИ</b> — ${b.booking_number}`,
    ``,
    `👤 ${b.last_name} ${b.first_name}`,
    `🛏 ${b.room_name}  •  заезд ${fmt(b.check_in)}`,
  ].join("\n");

  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID ?? "";
  return sendMessage(chatId, text);
}

// ─── Тестовое сообщение ───────────────────────────────────────────────────────

import { createServerFn } from "@tanstack/react-start";
import { requireStaff } from "@/integrations/supabase/staff-middleware";

export const sendTelegramTest = createServerFn({ method: "POST" }).middleware([requireStaff]).handler(async () => {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID ?? "";
  const ok = await sendMessage(
    chatId,
    [
      `🏨 <b>Тест уведомлений — Гостиница Полуостров</b>`,
      ``,
      `✅ Telegram-бот подключён успешно!`,
      `Вы будете получать уведомления о новых бронях и оплатах.`,
    ].join("\n"),
  );
  return { ok };
});
