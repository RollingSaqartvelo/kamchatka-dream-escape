import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const profileSchema = z.object({
  salutation: z.enum(["mr", "mrs"]).nullable().optional(),
  first_name: z.string().trim().max(100).optional().nullable(),
  last_name: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  email: z.string().trim().email().max(255).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  messenger_type: z.enum(["telegram", "vk_max", "none"]).nullable().optional(),
  messenger_username: z.string().trim().max(100).optional().nullable(),
});

export type ProfileData = z.infer<typeof profileSchema>;

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => profileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          salutation: data.salutation ?? null,
          first_name: data.first_name ?? null,
          last_name: data.last_name ?? null,
          phone: data.phone ?? null,
          email: data.email ?? null,
          city: data.city ?? null,
          country: data.country ?? null,
          messenger_type: data.messenger_type ?? null,
          messenger_username: data.messenger_username ?? null,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const linkBookingToMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bookingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Use admin client to bypass RLS for this targeted update
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ user_id: userId })
      .eq("id", data.bookingId)
      .is("user_id", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_number, room_name, check_in, check_out, nights, adults, children, total_price, prepayment_amount, payment_status, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
