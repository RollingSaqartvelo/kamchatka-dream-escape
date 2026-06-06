import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/integrations/supabase/staff-middleware";
import { enforceRateLimit } from "./rate-limit";

function admin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function sendReplyEmail(to: string, guestName: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"></head>
<body style="font-family:Georgia,serif;background:#f5f2ee;margin:0;padding:0;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);">
    <div style="background:#1a1a2e;padding:32px 40px;text-align:center;">
      <p style="color:#C9A96E;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">ГОСТИНИЦА</p>
      <h1 style="color:#fff;font-family:Georgia,serif;font-size:28px;margin:0;font-weight:400;">ПОЛУОСТРОВ</h1>
    </div>
    <div style="padding:40px;">
      <p style="color:#C9A96E;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">Ответ администратора</p>
      <p style="color:#666;font-size:14px;margin:0 0 8px;">${guestName}, вам ответили:</p>
      <div style="background:#f9f7f4;border-left:4px solid #C9A96E;padding:16px 20px;margin:16px 0;border-radius:2px;">
        <p style="color:#1a1a2e;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      </div>
      <p style="color:#888;font-size:13px;line-height:1.7;margin-top:24px;">
        Чтобы ответить, напишите нам:<br>
        📞 <strong>+7 (914) 994-57-57</strong>
      </p>
    </div>
    <div style="background:#f5f2ee;padding:24px 40px;text-align:center;border-top:1px solid #e8e4de;">
      <p style="color:#888;font-size:12px;margin:0;">Гостиница «Полуостров» · ул. Абеля, 41, Петропавловск-Камчатский</p>
    </div>
  </div>
</body></html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Гостиница Полуостров <onboarding@resend.dev>",
      reply_to: process.env.EMAIL_REPLY_TO ?? "poluostrovkam@mail.ru",
      to,
      subject: "Ответ от гостиницы «Полуостров»",
      html,
    }),
  });
}

// ─── Создать диалог (вызывается при новой брони) ──────────────────────────────

export async function createConversationForBooking(opts: {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  bookingNumber: string;
  roomName: string;
  checkIn: string;
}) {
  const db = admin();
  const body = `Новое бронирование #${opts.bookingNumber}: ${opts.roomName}, заезд ${opts.checkIn}`;

  const { data: conv } = await db
    .from("conversations")
    .insert({
      booking_id: opts.bookingId,
      guest_name: opts.guestName,
      guest_email: opts.guestEmail,
      guest_phone: opts.guestPhone,
      channel: "website",
      status: "open",
      unread_count: 1,
      last_preview: body,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (!conv?.id) return;

  await db.from("messages").insert({
    conversation_id: conv.id,
    sender: "guest",
    body,
  });
}

// ─── Список диалогов ──────────────────────────────────────────────────────────

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireStaff])
  .handler(async () => {
    const { data } = await admin()
      .from("conversations")
      .select("id,booking_id,guest_name,guest_email,guest_phone,channel,status,unread_count,last_preview,last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

// ─── Сообщения диалога ────────────────────────────────────────────────────────

export const getMessages = createServerFn({ method: "GET" })
  .middleware([requireStaff])
  .inputValidator(z.object({ conversationId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const db = admin();

    const { data: msgs } = await db
      .from("messages")
      .select("id,sender,body,read_at,created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });

    // Помечаем входящие как прочитанные
    await db
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversationId)
      .eq("sender", "guest")
      .is("read_at", null);

    // Сбрасываем счётчик
    await db
      .from("conversations")
      .update({ unread_count: 0 })
      .eq("id", data.conversationId);

    return msgs ?? [];
  });

// ─── Ответить гостю ───────────────────────────────────────────────────────────

export const replyToGuest = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator(
    z.object({
      conversationId: z.string().uuid(),
      body: z.string().trim().min(1).max(2000),
    }),
  )
  .handler(async ({ data }) => {
    const db = admin();

    // Получаем данные гостя для отправки email
    const { data: conv } = await db
      .from("conversations")
      .select("guest_name,guest_email")
      .eq("id", data.conversationId)
      .single();

    const { data: msg, error } = await db
      .from("messages")
      .insert({
        conversation_id: data.conversationId,
        sender: "admin",
        body: data.body,
        read_at: new Date().toISOString(),
      })
      .select("id,sender,body,read_at,created_at")
      .single();

    if (error) throw new Error(error.message);

    await db
      .from("conversations")
      .update({
        last_preview: `Вы: ${data.body.slice(0, 80)}`,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", data.conversationId);

    // Отправляем email гостю (fire-and-forget)
    if (conv?.guest_email) {
      sendReplyEmail(conv.guest_email, conv.guest_name, data.body).catch((e) =>
        console.error("sendReplyEmail failed:", e),
      );
    }

    return msg;
  });

// ─── Изменить статус диалога ──────────────────────────────────────────────────

export const setConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator(
    z.object({
      conversationId: z.string().uuid(),
      status: z.enum(["open", "resolved", "spam"]),
    }),
  )
  .handler(async ({ data }) => {
    const { error } = await admin()
      .from("conversations")
      .update({ status: data.status })
      .eq("id", data.conversationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Создать диалог вручную (из форм обратной связи) ─────────────────────────

export const createManualConversation = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator(
    z.object({
      guestName: z.string().min(1).max(100),
      guestEmail: z.string().email().max(255),
      guestPhone: z.string().max(32).optional(),
      channel: z.enum(["website", "telegram", "vk", "phone", "email"]),
      firstMessage: z.string().min(1).max(2000),
    }),
  )
  .handler(async ({ data }) => {
    const db = admin();

    const { data: conv, error } = await db
      .from("conversations")
      .insert({
        guest_name: data.guestName,
        guest_email: data.guestEmail,
        guest_phone: data.guestPhone ?? "",
        channel: data.channel,
        status: "open",
        unread_count: 1,
        last_preview: data.firstMessage.slice(0, 100),
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !conv?.id) throw new Error(error?.message ?? "Failed to create conversation");

    await db.from("messages").insert({
      conversation_id: conv.id,
      sender: "guest",
      body: data.firstMessage,
    });

    return { id: conv.id };
  });

// ─── Публичные функции для гостя (без авторизации) ───────────────────────────
// Защищены парой bookingId + email — гость получает ссылку в письме

export const getGuestChat = createServerFn({ method: "GET" })
  .inputValidator(z.object({ bookingId: z.string().uuid(), email: z.string().email() }))
  .handler(async ({ data }) => {
    const db = admin();

    // Проверяем что email совпадает с бронью
    const { data: booking } = await db
      .from("bookings")
      .select("id,first_name,last_name,room_name,check_in,check_out,nights,payment_status")
      .eq("id", data.bookingId)
      .ilike("email", data.email)
      .single();

    if (!booking) return { booking: null, messages: [] };

    // Находим диалог по брони
    const { data: conv } = await db
      .from("conversations")
      .select("id")
      .eq("booking_id", data.bookingId)
      .single();

    if (!conv) return { booking, messages: [] };

    const { data: msgs } = await db
      .from("messages")
      .select("id,sender,body,created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    return { booking, messages: msgs ?? [], conversationId: conv.id };
  });

export const sendGuestMessage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      bookingId: z.string().uuid(),
      email: z.string().email(),
      body: z.string().trim().min(1).max(2000),
    }),
  )
  .handler(async ({ data }) => {
    // Антиспам: не более 10 сообщений за минуту с одного IP.
    await enforceRateLimit("guest_msg", { max: 10, windowSec: 60 });

    const db = admin();

    // Проверяем бронь + email
    const { data: booking } = await db
      .from("bookings")
      .select("id,first_name,last_name,email,room_name,check_in")
      .eq("id", data.bookingId)
      .ilike("email", data.email)
      .single();

    if (!booking) throw new Error("Бронирование не найдено");

    // Находим или создаём диалог
    let convId: string;
    const { data: existing } = await db
      .from("conversations")
      .select("id,unread_count")
      .eq("booking_id", data.bookingId)
      .single();

    if (existing) {
      convId = existing.id;
      await db.from("conversations").update({
        unread_count: (existing.unread_count ?? 0) + 1,
        last_preview: data.body.slice(0, 100),
        last_message_at: new Date().toISOString(),
        status: "open",
      }).eq("id", convId);
    } else {
      const { data: newConv } = await db.from("conversations").insert({
        booking_id: data.bookingId,
        guest_name: `${booking.first_name} ${booking.last_name}`,
        guest_email: booking.email,
        channel: "website",
        status: "open",
        unread_count: 1,
        last_preview: data.body.slice(0, 100),
        last_message_at: new Date().toISOString(),
      }).select("id").single();
      if (!newConv) throw new Error("Не удалось создать диалог");
      convId = newConv.id;
    }

    const { data: msg } = await db.from("messages").insert({
      conversation_id: convId,
      sender: "guest",
      body: data.body,
    }).select("id,sender,body,created_at").single();

    // Уведомляем администратора в Telegram
    notifyAdminNewGuestMessage({
      guestName: `${booking.first_name} ${booking.last_name}`,
      roomName: booking.room_name,
      checkIn: booking.check_in,
      body: data.body,
    }).catch(() => {});

    return msg;
  });

async function notifyAdminNewGuestMessage(b: {
  guestName: string; roomName: string; checkIn: string; body: string;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;
  const fmt = (d: string) => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const text = [
    `💬 <b>СООБЩЕНИЕ ОТ ГОСТЯ</b>`,
    ``,
    `👤 ${b.guestName}  •  ${b.roomName}, заезд ${fmt(b.checkIn)}`,
    ``,
    `"${b.body.slice(0, 300)}"`,
    ``,
    `🔗 <a href="https://poluostrov-hotel.ru/admin/inbox">Открыть инбокс</a>`,
  ].join("\n");
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}
