import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Проверяем секрет от Telegram
        const secret = request.headers.get("x-telegram-bot-api-secret-token");
        if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response("ok");
        }

        const message = body?.message;
        if (!message) return new Response("ok");

        const chatId = message.from?.id;
        const firstName = message.from?.first_name ?? "";
        const username = message.from?.username ?? "";
        const text: string = message.text ?? "";

        if (!chatId) return new Response("ok");

        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return new Response("ok");

        const send = async (msg: string) => {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
          });
        };

        // /start [bookingId без дефисов]
        if (text.startsWith("/start")) {
          const param = text.split(" ")[1]?.trim();

          if (!param || param.length < 10) {
            await send(
              `👋 Добро пожаловать в бот гостиницы «Полуостров»!\n\n` +
              `Для подписки на напоминания о заезде используйте ссылку из письма-подтверждения брони.`,
            );
            return new Response("ok");
          }

          // Восстанавливаем UUID из строки без дефисов
          const bookingId = param.length === 32
            ? `${param.slice(0,8)}-${param.slice(8,12)}-${param.slice(12,16)}-${param.slice(16,20)}-${param.slice(20)}`
            : param;

          const db = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } },
          );

          // Проверяем что бронь существует
          const { data: booking } = await db
            .from("bookings")
            .select("id,first_name,room_name,check_in")
            .eq("id", bookingId)
            .single();

          if (!booking) {
            await send("❌ Бронирование не найдено. Используйте ссылку из письма.");
            return new Response("ok");
          }

          // Сохраняем подписчика
          await db.from("telegram_subscribers").upsert(
            { booking_id: bookingId, chat_id: chatId, first_name: firstName, username },
            { onConflict: "booking_id,chat_id" },
          );

          const checkIn = new Date(booking.check_in).toLocaleDateString("ru-RU", {
            day: "numeric", month: "long",
          });

          await send(
            `✅ <b>Подписка оформлена!</b>\n\n` +
            `${firstName}, вы будете получать напоминание о заезде.\n\n` +
            `🛏 ${booking.room_name}\n` +
            `📅 Заезд: ${checkIn}\n\n` +
            `За сутки до заезда мы пришлём вам напоминание сюда.`,
          );
        }

        return new Response("ok");
      },
    },
  },
});
