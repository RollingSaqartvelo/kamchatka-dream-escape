import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Маппинг наших ID номеров → roomTypeId в Travelline (property 20442 «Полуостров»).
 * Названия в TL отличаются от наших, но соответствие подтверждено вручную.
 */
export const ROOM_ID_TO_TL: Record<string, number> = {
  "dvuhmestnyy-standart": 145914,           // TL: Двухместный
  "comfort-3-shower": 145915,               // TL: Трёхместный
  "dvuhmestnyy-komfort": 201619,            // TL: Двухместный улучшенный
  "dvuhmestnyy-komfort-dop-mesto": 227020,  // TL: Двухместный улучшенный (с доп. местом)
  "semeynyy-delux": 279217,                 // TL: Семейный «Делюкс»
  "dvuhmestnyy-ekonom": 279219,             // TL: Двухместный Эконом
  "dvuhmestnyy-ekonom-dop-mesto": 279249,   // TL: Двухместный Эконом с доп. местом
  "hostel-10-mest": 145917,                 // TL: Койко-место (10-местный, А)
  "hostel-10-mest-b": 145918,               // TL: Койко-место (10-местный, Б)
  "hostel-4-mesta": 145919,                 // TL: Койко-место без окон (4-местный)
  "hostel-12-mest": 145916,                 // TL: Койко-место (12-местный)
};

/**
 * Rate plans в TL.
 * 309891 — «Лучшая цена дня» (без завтрака) → room_only
 * 390629 — «Тариф с завтраком» → breakfast
 */
export const RATE_PLAN_BY_MEAL: Record<"room_only" | "breakfast", number> = {
  room_only: 309891,
  breakfast: 390629,
};

// ─── Token cache (in-memory per worker) ──────────────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getTravellineToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.token;
  }

  const baseUrl = process.env.TRAVELLINE_API_BASE_URL!;
  const clientId = process.env.TRAVELLINE_CLIENT_ID!;
  const clientSecret = process.env.TRAVELLINE_CLIENT_SECRET!;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Travelline auth failed: ${res.status} ${txt.slice(0, 200)}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: now + (json.expires_in ?? 900) * 1000,
  };
  return cachedToken.token;
}

// ─── Server function: search availability for one room/date range ────────────
export const searchTravellineAvailability = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      roomId: z.string().min(1).max(64),
      checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      adults: z.number().int().min(1).max(10),
      children: z.number().int().min(0).max(10).default(0),
      mealPlan: z.enum(["room_only", "breakfast"]).default("room_only"),
    }),
  )
  .handler(async ({ data }) => {
    const tlRoomTypeId = ROOM_ID_TO_TL[data.roomId];
    if (!tlRoomTypeId) {
      return { available: false, totalPrice: null as number | null, error: "no_mapping" };
    }

    try {
      const token = await getTravellineToken();
      const baseUrl = process.env.TRAVELLINE_API_BASE_URL!;
      const propertyId = process.env.TRAVELLINE_PROPERTY_ID!;
      const ratePlanId = RATE_PLAN_BY_MEAL[data.mealPlan];

      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId: Number(propertyId),
          arrival: data.checkIn,
          departure: data.checkOut,
          adults: data.adults,
          children: data.children,
          roomTypeIds: [tlRoomTypeId],
          ratePlanIds: [ratePlanId],
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("TL search error", res.status, txt.slice(0, 300));
        return { available: false, totalPrice: null, error: `tl_${res.status}` };
      }

      const json: any = await res.json();
      // Travelline search response: roomStays[].total.amount
      const stay = json?.roomStays?.[0] ?? json?.offers?.[0] ?? null;
      const amount =
        stay?.total?.amount ??
        stay?.totalPrice ??
        stay?.price?.amount ??
        null;

      return {
        available: amount != null,
        totalPrice: amount != null ? Math.round(Number(amount)) : null,
        ratePlanId,
        tlRoomTypeId,
        raw: stay ?? null,
      };
    } catch (e) {
      console.error("TL search exception", e);
      return { available: false, totalPrice: null, error: "exception" };
    }
  });
