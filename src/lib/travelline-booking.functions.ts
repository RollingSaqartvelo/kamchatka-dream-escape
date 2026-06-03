import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/integrations/supabase/staff-middleware";
import { getTravellineToken, ROOM_ID_TO_TL, RATE_PLAN_BY_MEAL } from "./travelline.functions";

// ─────────────────────────────────────────────────────────────────────────────
// Отправка брони с сайта в TravelLine (пай-фёрст: вызывается ПОСЛЕ оплаты).
// Поток TL Reservation API: search → verify (createBookingToken) → booking.
// Создаём бронь → TL подтверждает мгновенно и закрывает наличие на всех каналах.
//
// ВАЖНО: точные имена полей verify/create финализируем по первому реальному
// ответу TL (см. diagnose-функцию). Авто-вызов из оплаты включается флагом
// TL_PUSH_ENABLED=1, чтобы не отправлять в TL вслепую.
// ─────────────────────────────────────────────────────────────────────────────

const TL_API = "https://partner.tlintegration.com";

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

type Bk = {
  id: string;
  booking_number: string | null;
  room_id: string;
  check_in: string;
  check_out: string;
  adults: number | null;
  children: number | null;
  meal_plan: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  prepayment_amount: number | null;
  total_price: number | null;
  tl_reservation_id: string | null;
};

async function loadBooking(bookingId: string): Promise<Bk | null> {
  const { data } = await admin()
    .from("bookings")
    .select(
      "id,booking_number,room_id,check_in,check_out,adults,children,meal_plan,first_name,last_name,email,phone,prepayment_amount,total_price,tl_reservation_id",
    )
    .eq("id", bookingId)
    .single();
  return (data as Bk) ?? null;
}

// Поиск предложения в TL: возвращает сырой ответ (нужен createBookingToken + roomStay).
async function searchOffer(b: Bk, token: string) {
  const baseUrl = process.env.TRAVELLINE_API_BASE_URL!;
  const propertyId = Number(process.env.TRAVELLINE_PROPERTY_ID!);
  const tlRoomTypeId = ROOM_ID_TO_TL[b.room_id];
  const ratePlanId = RATE_PLAN_BY_MEAL[(b.meal_plan as "room_only" | "breakfast") ?? "room_only"] ?? RATE_PLAN_BY_MEAL.room_only;
  const body = {
    propertyId,
    arrival: b.check_in,
    departure: b.check_out,
    adults: Math.max(1, b.adults ?? 1),
    children: b.children ?? 0,
    roomTypeIds: [tlRoomTypeId],
    ratePlanIds: [ratePlanId],
  };
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body, json };
}

// Диагностика (только персонал): показывает сырой ответ поиска TL для брони.
// По нему уточняем структуру (createBookingToken, roomStays) перед verify/create.
export const inspectTravellineOffer = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator(z.object({ bookingId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const b = await loadBooking(data.bookingId);
    if (!b) return { ok: false, error: "booking_not_found" };
    if (!ROOM_ID_TO_TL[b.room_id]) return { ok: false, error: `no_tl_mapping:${b.room_id}` };
    const token = await getTravellineToken();
    const search = await searchOffer(b, token);
    return { ok: search.ok, status: search.status, request: search.body, response: search.json };
  });

// Полный пуш брони в TL (best-effort по докам; финализируется после теста).
export async function pushBookingToTravelline(bookingId: string): Promise<{ ok: boolean; reservationId?: string; error?: string; log?: any }> {
  const b = await loadBooking(bookingId);
  if (!b) return { ok: false, error: "booking_not_found" };
  if (b.tl_reservation_id) return { ok: true, reservationId: b.tl_reservation_id }; // уже отправлена
  const tlRoomTypeId = ROOM_ID_TO_TL[b.room_id];
  if (!tlRoomTypeId) return { ok: false, error: `no_tl_mapping:${b.room_id}` };

  const token = await getTravellineToken();
  const propertyId = Number(process.env.TRAVELLINE_PROPERTY_ID!);
  const ratePlanId = RATE_PLAN_BY_MEAL[(b.meal_plan as "room_only" | "breakfast") ?? "room_only"] ?? RATE_PLAN_BY_MEAL.room_only;

  // 1) Поиск → createBookingToken
  const search = await searchOffer(b, token);
  const createBookingToken =
    (search.json as any)?.createBookingToken ??
    (search.json as any)?.roomStays?.[0]?.createBookingToken ??
    null;
  if (!search.ok || !createBookingToken) {
    console.error("TL push: no createBookingToken from search", search.status, JSON.stringify(search.json)?.slice(0, 500));
    return { ok: false, error: "no_create_token", log: { status: search.status, response: search.json } };
  }

  const adults = Math.max(1, b.adults ?? 1);
  const childAges = Array.from({ length: b.children ?? 0 }, () => 10);
  const customer = {
    lastName: b.last_name || "Гость",
    firstName: b.first_name || "",
    email: b.email || undefined,
    phone: b.phone || undefined,
  };
  const roomStay = {
    roomTypeId: tlRoomTypeId,
    ratePlanId,
    arrival: b.check_in,
    departure: b.check_out,
    guestCount: { adults, childAges },
    guests: [{ firstName: customer.firstName, lastName: customer.lastName }],
  };

  // 2) Verify
  const verifyBody = { createBookingToken, booking: { customer, roomStays: [roomStay] } };
  const verifyRes = await fetch(`${TL_API}/api/reservation/v1/bookings/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(verifyBody),
  });
  const verifyJson = await verifyRes.json().catch(() => null);
  if (!verifyRes.ok) {
    console.error("TL push: verify failed", verifyRes.status, JSON.stringify(verifyJson)?.slice(0, 500));
    return { ok: false, error: `verify_${verifyRes.status}`, log: verifyJson };
  }
  const checksum = (verifyJson as any)?.checksum ?? (verifyJson as any)?.booking?.checksum;

  // 3) Create booking
  const createBody = {
    createBookingToken,
    checksum,
    booking: {
      customer,
      roomStays: [roomStay],
      prepayment: { prepaidSum: b.prepayment_amount ?? 0, paymentType: "PrePay" },
      bookingComment: `Бронь с сайта №${b.booking_number ?? ""}`.trim(),
    },
  };
  const createRes = await fetch(`${TL_API}/api/reservation/v1/bookings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(createBody),
  });
  const createJson = await createRes.json().catch(() => null);
  if (!createRes.ok) {
    console.error("TL push: create failed", createRes.status, JSON.stringify(createJson)?.slice(0, 500));
    return { ok: false, error: `create_${createRes.status}`, log: createJson };
  }

  const reservationId =
    (createJson as any)?.number ??
    (createJson as any)?.booking?.number ??
    (createJson as any)?.reservationId ??
    null;

  // Сохраняем номер TL, чтобы PULL-синк не задвоил
  if (reservationId) {
    await admin().from("bookings").update({ tl_reservation_id: String(reservationId) }).eq("id", b.id);
  }
  return { ok: true, reservationId: reservationId ?? undefined, log: createJson };
}

// Ручной тест из админки (персонал): запускает полный пуш и возвращает сырой результат.
export const testPushToTravelline = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator(z.object({ bookingId: z.string().uuid() }))
  .handler(async ({ data }) => {
    return pushBookingToTravelline(data.bookingId);
  });
