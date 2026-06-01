import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { ROOM_ID_TO_TL } from "@/lib/travelline.functions";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TL_API = "https://partner.tlintegration.com";

// TL roomTypeId → наш room_id
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

  const clientId = process.env.TRAVELLINE_CLIENT_ID!;
  const clientSecret = process.env.TRAVELLINE_CLIENT_SECRET!;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(`${TL_API}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Travelline auth ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: now + (json.expires_in ?? 900) * 1000 };
  return cachedToken.token;
}

function mapStatus(tl: string): string {
  if (tl === "Cancelled") return "cancelled";
  if (tl === "Unconfirmed") return "pending";
  return "confirmed"; // Active
}

// Map a Read-Reservation booking detail → our `bookings` row.
function mapBooking(detail: any) {
  const bk = detail?.booking;
  if (!bk) return null;
  const rs = bk.roomStays?.[0] ?? {};
  const checkIn = String(rs.stayDates?.arrivalDateTime ?? "").slice(0, 10);
  const checkOut = String(rs.stayDates?.departureDateTime ?? "").slice(0, 10);
  if (!checkIn || !checkOut) return null;

  const nights = Math.max(1, Math.round((+new Date(checkOut) - +new Date(checkIn)) / 86400000));
  const tlRoomTypeId = Number(rs.roomType?.id);
  const roomId = TL_TO_ROOM_ID[tlRoomTypeId] ?? "unknown";
  const roomRevenue = (bk.roomStays ?? []).reduce(
    (s: number, r: any) => s + (r.total?.priceAfterTax ?? 0),
    0,
  );
  // Guest PII is masked by the API ("*****"); store a neutral label.
  const masked = (v: any) => !v || String(v).includes("*");
  const firstName = masked(bk.customer?.firstName) ? "" : String(bk.customer.firstName);
  const lastName = masked(bk.customer?.lastName) ? "Бронь TL" : String(bk.customer.lastName);

  return {
    tl_reservation_id: String(bk.number),
    source: "travelline",
    first_name: firstName || "—",
    last_name: lastName,
    phone: "",
    email: "tl@noemail.invalid",
    room_id: roomId,
    room_name: String(rs.roomType?.name ?? roomId),
    check_in: checkIn,
    check_out: checkOut,
    nights,
    adults: Number(rs.guestCount?.adultCount ?? 2),
    children: (rs.guestCount?.childAges ?? []).length,
    meal_plan: "room_only",
    room_price_total: Math.round(roomRevenue),
    total_price: Math.round(bk.total?.priceAfterTax ?? roomRevenue),
    payment_status: mapStatus(String(bk.status)),
    id_consent: true,
    terms_consent: true,
    special_requests: [],
  };
}

export const syncTravellineReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      // bookings modified since this date are pulled (incremental sync)
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const propertyId = process.env.TRAVELLINE_PROPERTY_ID;
    if (!propertyId) return { ok: false, error: "TRAVELLINE_PROPERTY_ID missing", synced: 0 };

    let token: string;
    try {
      token = await getToken();
    } catch (e) {
      return { ok: false, error: (e as Error).message, synced: 0 };
    }
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const base = `${TL_API}/api/read-reservation/v1/properties/${propertyId}/bookings`;
    const lastModification = `${data.from}T00:00:00Z`;

    // Cap per run to stay within Worker subrequest/time limits; the 15-min cron
    // keeps catching up incrementally.
    const MAX_DETAILS = 80;
    const BATCH = 8;

    // 1) collect booking numbers from paginated summaries (modified since `from`)
    const numbers: string[] = [];
    let continueToken: string | null = null;
    let guard = 0;
    try {
      do {
        const url = new URL(base);
        url.searchParams.set("lastModification", lastModification);
        url.searchParams.set("count", "1000");
        if (continueToken) url.searchParams.set("continueToken", continueToken);
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          return { ok: false, error: `summaries ${res.status}: ${txt.slice(0, 160)}`, synced: 0 };
        }
        const j: any = await res.json();
        for (const s of j.bookingSummaries ?? []) {
          if (numbers.length >= MAX_DETAILS) break;
          numbers.push(String(s.number));
        }
        continueToken = j.hasMoreData ? j.continueToken : null;
        guard++;
      } while (continueToken && numbers.length < MAX_DETAILS && guard < 5);
    } catch (e) {
      return { ok: false, error: `summaries exception: ${(e as Error).message}`, synced: 0 };
    }

    if (numbers.length === 0) {
      return { ok: true, synced: 0, note: "Нет броней, изменённых с указанной даты" };
    }

    // 2) fetch details in parallel batches and map
    const rows: any[] = [];
    for (let i = 0; i < numbers.length; i += BATCH) {
      const slice = numbers.slice(i, i + BATCH);
      const details = await Promise.all(
        slice.map(async (num) => {
          try {
            const r = await fetch(`${base}/${num}`, { headers });
            if (!r.ok) return null;
            return await r.json();
          } catch {
            return null;
          }
        }),
      );
      for (const d of details) {
        const row = mapBooking(d);
        if (row) rows.push(row);
      }
    }

    if (rows.length === 0) {
      return { ok: true, synced: 0, note: "Брони получены, но не удалось распарсить детали" };
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { error } = await supabaseAdmin
      .from("bookings")
      .upsert(rows, { onConflict: "tl_reservation_id" });
    if (error) return { ok: false, error: error.message, synced: 0 };

    return {
      ok: true,
      synced: rows.length,
      hasMore: numbers.length >= MAX_DETAILS,
    };
  });
