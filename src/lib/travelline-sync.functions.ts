import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { ROOM_ID_TO_TL } from "@/lib/travelline.functions";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Обратный маппинг TL roomTypeId → наш room_id
const TL_TO_ROOM_ID: Record<number, string> = Object.entries(ROOM_ID_TO_TL).reduce(
  (acc, [ourId, tlId]) => {
    acc[tlId] = ourId;
    return acc;
  },
  {} as Record<number, string>,
);

// ─── token cache ────────────────────────────────────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) return cachedToken.token;

  const baseUrl = process.env.TRAVELLINE_API_BASE_URL!;
  const clientId = process.env.TRAVELLINE_CLIENT_ID!;
  const clientSecret = process.env.TRAVELLINE_CLIENT_SECRET!;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`https://partner.tlintegration.com/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Travelline auth ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: now + (json.expires_in ?? 900) * 1000,
  };
  return cachedToken.token;
}

// Пробуем несколько endpoint'ов Reservations API, возвращаем первый успешный
async function fetchReservations(
  token: string,
  baseUrl: string,
  propertyId: string,
  from: string,
  to: string,
): Promise<{ data: any; endpoint: string } | { error: string }> {
  const TL_API = "https://partner.tlintegration.com";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Декодируем JWT чтобы узнать propertyId и scopes из токена
  const tokenParts = token.split(".");
  if (tokenParts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString("utf-8"));
      return {
        ok: false,
        error: `DEBUG TOKEN: ${JSON.stringify(payload).slice(0, 800)}`,
        synced: 0,
      } as any;
    } catch {}
  }

  const attempts: Array<{ url: string; method: "GET" | "POST"; body?: string }> = [
    {
      url: `${TL_API}/api/reservation/v1/properties/${propertyId}/bookings`,
      method: "GET",
    },
  ];

  const errors: string[] = [];
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, { method: a.method, headers, body: a.body });
      if (res.ok) {
        const data = await res.json();
        return { data, endpoint: `${a.method} ${a.url}` };
      }
      const txt = await res.text().catch(() => "");
      errors.push(`${a.method} ${a.url} → ${res.status} ${txt.slice(0, 120)}`);
    } catch (e) {
      errors.push(`${a.method} ${a.url} → exception ${(e as Error).message}`);
    }
  }
  return { error: errors.join(" | ") };
}

function extractReservationsArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  for (const key of ["reservations", "items", "data", "list", "results"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function mapTlStatus(tl: any): string {
  const s = String(tl?.status ?? tl?.state ?? "").toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("checkout") || s.includes("completed")) return "completed";
  if (s.includes("checkin") || s.includes("inhouse")) return "confirmed";
  if (s.includes("paid")) return "paid";
  if (s.includes("confirm")) return "confirmed";
  return "confirmed";
}

function getField(o: any, ...keys: string[]): any {
  for (const k of keys) {
    const v = k.split(".").reduce((acc, kk) => acc?.[kk], o);
    if (v != null && v !== "") return v;
  }
  return null;
}

export const syncTravellineReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .handler(async ({ data }) => {
    const baseUrl = process.env.TRAVELLINE_API_BASE_URL;
    const propertyId = process.env.TRAVELLINE_PROPERTY_ID;
    if (!baseUrl || !propertyId) {
      return { ok: false, error: "Travelline env vars missing" };
    }

    const token = await getToken();
    const result = await fetchReservations(token, baseUrl, propertyId, data.from, data.to);
    if ("error" in result) {
      return { ok: false, error: result.error, synced: 0 };
    }

    const list = extractReservationsArray(result.data);
    if (list.length === 0) {
      return {
        ok: true,
        synced: 0,
        endpoint: result.endpoint,
        note: "Travelline вернул пустой список броней за период",
        sample: result.data,
      };
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const rows = list
      .map((r: any) => {
        const tlRoomTypeId = Number(
          getField(r, "roomTypeId", "rooms.0.roomTypeId", "roomStays.0.roomTypeId"),
        );
        const ourRoomId = TL_TO_ROOM_ID[tlRoomTypeId] ?? "unknown";
        const checkIn = String(
          getField(r, "arrival", "checkIn", "arrivalDate", "period.from") ?? "",
        ).slice(0, 10);
        const checkOut = String(
          getField(r, "departure", "checkOut", "departureDate", "period.to") ?? "",
        ).slice(0, 10);
        if (!checkIn || !checkOut) return null;
        const nights = Math.max(
          1,
          Math.round(
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400_000,
          ),
        );
        return {
          tl_reservation_id: String(
            getField(r, "id", "reservationId", "uuid", "number") ?? "",
          ),
          source: "travelline",
          first_name: String(getField(r, "guest.firstName", "customer.firstName") ?? "—"),
          last_name: String(
            getField(r, "guest.lastName", "customer.lastName", "guestName") ?? "TL",
          ),
          phone: String(getField(r, "guest.phone", "customer.phone") ?? ""),
          email: String(getField(r, "guest.email", "customer.email") ?? "tl@noemail.invalid"),
          room_id: ourRoomId,
          room_name: String(getField(r, "roomTypeName", "rooms.0.roomTypeName") ?? ourRoomId),
          check_in: checkIn,
          check_out: checkOut,
          nights,
          adults: Number(getField(r, "adults", "guests.adults") ?? 2),
          children: Number(getField(r, "children", "guests.children") ?? 0),
          meal_plan: "room_only",
          total_price: Math.round(
            Number(getField(r, "total.amount", "totalPrice", "amount") ?? 0),
          ),
          payment_status: mapTlStatus(r),
          id_consent: true,
          terms_consent: true,
          special_requests: [],
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && !!x.tl_reservation_id);

    if (rows.length === 0) {
      return {
        ok: true,
        synced: 0,
        endpoint: result.endpoint,
        note: "Брони получены, но не удалось распарсить",
        sample: list[0],
      };
    }

    const { error } = await supabaseAdmin
      .from("bookings")
      .upsert(rows, { onConflict: "tl_reservation_id" });

    if (error) {
      return { ok: false, error: error.message, synced: 0 };
    }
    return { ok: true, synced: rows.length, endpoint: result.endpoint };
  });
