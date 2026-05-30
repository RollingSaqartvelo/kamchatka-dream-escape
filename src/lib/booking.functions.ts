import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { ROOMS } from "@/data/rooms";
import { ROOM_ID_TO_TL, RATE_PLAN_BY_MEAL } from "./travelline.functions";
import { sendBookingConfirmation } from "./email.functions";
import { notifyNewBooking } from "./telegram.functions";

const BREAKFAST_PER_PERSON = 500;

const bookingSchema = z.object({
  salutation: z.enum(["mr", "mrs"]).nullable().optional(),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(5).max(32),
  email: z.string().trim().email().max(255),
  city: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),

  room_id: z.string().min(1).max(100),
  room_name: z.string().min(1).max(255),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nights: z.number().int().min(1).max(60),
  adults: z.number().int().min(1).max(10),
  children: z.number().int().min(0).max(10),
  meal_plan: z.enum(["room_only", "breakfast"]),

  special_requests: z.array(z.string().max(100)).max(20),
  custom_request: z.string().max(500).optional().nullable(),
  promo_code: z.string().max(50).optional().nullable(),

  messenger_type: z.enum(["telegram", "vk_max", "none"]).nullable().optional(),
  messenger_username: z.string().max(100).optional().nullable(),

  // Price fields are accepted from the client for backwards-compat but
  // SERVER-SIDE values are authoritative. Client values are ignored.
  room_price_total: z.number().int().min(0).max(10000000).optional(),
  breakfast_total: z.number().int().min(0).max(10000000).optional(),
  total_price: z.number().int().min(0).max(10000000).optional(),
  prepayment_amount: z.number().int().min(0).max(10000000).optional(),
  remaining_amount: z.number().int().min(0).max(10000000).optional(),

  id_consent: z.literal(true),
  terms_consent: z.literal(true),
});

export type BookingInput = z.infer<typeof bookingSchema>;

/**
 * Считает сумму предоплаты: max(30% от total, стоимость 1 ночи).
 */
export function calcPrepayment(totalPrice: number, nights: number): number {
  if (!totalPrice || !nights) return 0;
  const oneNight = Math.round(totalPrice / nights);
  const thirty = Math.round(totalPrice * 0.3);
  return Math.max(oneNight, thirty);
}

// ─── Server-side price calculation (authoritative) ───────────────────────────
async function fetchTravellineRoomTotal(
  roomId: string,
  checkIn: string,
  checkOut: string,
  adults: number,
  children: number,
  mealPlan: "room_only" | "breakfast",
): Promise<number | null> {
  const tlRoomTypeId = ROOM_ID_TO_TL[roomId];
  if (!tlRoomTypeId) return null;
  const baseUrl = process.env.TRAVELLINE_API_BASE_URL;
  const propertyId = process.env.TRAVELLINE_PROPERTY_ID;
  const clientId = process.env.TRAVELLINE_CLIENT_ID;
  const clientSecret = process.env.TRAVELLINE_CLIENT_SECRET;
  if (!baseUrl || !propertyId || !clientId || !clientSecret) return null;

  try {
    const tokenRes = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!tokenRes.ok) return null;
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const ratePlanId = RATE_PLAN_BY_MEAL[mealPlan];
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        propertyId: Number(propertyId),
        arrival: checkIn,
        departure: checkOut,
        adults,
        children,
        roomTypeIds: [tlRoomTypeId],
        ratePlanIds: [ratePlanId],
      }),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const stay = json?.roomStays?.[0] ?? json?.offers?.[0] ?? null;
    const amount =
      stay?.total?.amount ?? stay?.totalPrice ?? stay?.price?.amount ?? null;
    return amount != null ? Math.round(Number(amount)) : null;
  } catch {
    return null;
  }
}

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    // ── Authoritative server-side pricing ────────────────────────────────
    const room = ROOMS.find((r) => r.id === data.room_id);
    if (!room) {
      throw new Error("Unknown room");
    }

    const guests = data.adults + data.children;

    // Try live Travelline price first; if unavailable, fall back to the
    // catalogue price * nights. The client-supplied price values are
    // never trusted.
    let roomPriceTotal =
      (await fetchTravellineRoomTotal(
        data.room_id,
        data.check_in,
        data.check_out,
        data.adults,
        data.children,
        "room_only",
      )) ?? room.price_from_rub * data.nights;

    let breakfastTotal = 0;
    if (data.meal_plan === "breakfast") {
      const tlWithBreakfast = await fetchTravellineRoomTotal(
        data.room_id,
        data.check_in,
        data.check_out,
        data.adults,
        data.children,
        "breakfast",
      );
      if (tlWithBreakfast != null) {
        // Travelline gave us a "with breakfast" total — derive breakfast as the delta.
        breakfastTotal = Math.max(0, tlWithBreakfast - roomPriceTotal);
        // Use the live with-breakfast total as the base if it's available.
        roomPriceTotal = tlWithBreakfast - breakfastTotal;
      } else {
        breakfastTotal = BREAKFAST_PER_PERSON * guests * data.nights;
      }
    }

    const totalPrice = roomPriceTotal + breakfastTotal;
    const prepaymentAmount = calcPrepayment(totalPrice, data.nights);
    const remainingAmount = Math.max(0, totalPrice - prepaymentAmount);

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
    );

    const { data: row, error } = await supabase
      .from("bookings")
      .insert({
        salutation: data.salutation ?? null,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email,
        city: data.city ?? null,
        country: data.country ?? null,
        room_id: data.room_id,
        room_name: room.name_ru,
        check_in: data.check_in,
        check_out: data.check_out,
        nights: data.nights,
        adults: data.adults,
        children: data.children,
        meal_plan: data.meal_plan,
        special_requests: data.special_requests,
        custom_request: data.custom_request ?? null,
        promo_code: data.promo_code ?? null,
        messenger_type: data.messenger_type ?? null,
        messenger_username: data.messenger_username ?? null,
        room_price_total: roomPriceTotal,
        breakfast_total: breakfastTotal,
        total_price: totalPrice,
        prepayment_amount: prepaymentAmount,
        remaining_amount: remainingAmount,
        payment_status: "pending",
        id_consent: data.id_consent,
        terms_consent: data.terms_consent,
      })
      .select("id, booking_number")
      .single();

    if (error) {
      console.error("createBooking error:", error);
      throw new Error(error.message);
    }

    // Отправляем подтверждение брони на email + Telegram (fire-and-forget)
    sendBookingConfirmation(row.id as string).catch((e) =>
      console.error("sendBookingConfirmation failed:", e),
    );
    notifyNewBooking({
      booking_number: row.booking_number as string,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      email: data.email,
      room_name: room.name_ru,
      check_in: data.check_in,
      check_out: data.check_out,
      nights: data.nights,
      adults: data.adults,
      children: data.children,
      meal_plan: data.meal_plan,
      total_price: totalPrice,
      prepayment_amount: prepaymentAmount,
      source: "website",
    }).catch((e) => console.error("notifyNewBooking failed:", e));

    return {
      id: row.id as string,
      booking_number: row.booking_number as string,
    };
  });
