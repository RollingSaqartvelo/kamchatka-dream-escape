import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

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

  room_price_total: z.number().int().min(0).max(10000000),
  breakfast_total: z.number().int().min(0).max(10000000),
  total_price: z.number().int().min(0).max(10000000),

  payment_method: z.enum(["card", "invoice"]).nullable().optional(),

  id_consent: z.literal(true),
  terms_consent: z.literal(true),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
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
        room_name: data.room_name,
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
        room_price_total: data.room_price_total,
        breakfast_total: data.breakfast_total,
        total_price: data.total_price,
        payment_method: data.payment_method ?? null,
        payment_status: "pending",
        id_consent: data.id_consent,
        terms_consent: data.terms_consent,
      })
      .select("booking_number")
      .single();

    if (error) {
      console.error("createBooking error:", error);
      throw new Error(error.message);
    }

    return { booking_number: row.booking_number as string };
  });
