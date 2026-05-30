import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function admin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
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
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      conversationId: z.string().uuid(),
      body: z.string().trim().min(1).max(2000),
    }),
  )
  .handler(async ({ data }) => {
    const db = admin();

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

    return msg;
  });

// ─── Изменить статус диалога ──────────────────────────────────────────────────

export const setConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
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
