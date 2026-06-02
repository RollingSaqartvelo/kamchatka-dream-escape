import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { ROOM_ID_TO_TL } from "@/lib/travelline.functions";
import { resolveTlChannel } from "@/lib/channels";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TL_API = "https://partner.tlintegration.com";

const TL_TO_ROOM_ID: Record<number, string> = Object.entries(ROOM_ID_TO_TL).reduce(
  (acc, [ourId, tlId]) => {
    acc[tlId] = ourId;
    return acc;
  },
  {} as Record<number, string>,
);

let cachedToken: { token: string; expiresAt: number } | null = null;
async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) return cachedToken.token;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.TRAVELLINE_CLIENT_ID!,
    client_secret: process.env.TRAVELLINE_CLIENT_SECRET!,
  });
  const res = await fetch(`${TL_API}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Travelline auth ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: now + (json.expires_in ?? 900) * 1000 };
  return cachedToken.token;
}

function mapStatus(tl: string): string {
  if (tl === "Cancelled") return "cancelled";
  if (tl === "Unconfirmed") return "pending";
  return "confirmed"; // Active
}

const masked = (v: any) => !v || String(v).includes("*");

// Одна TL-бронь (number) может быть ГРУППОВОЙ — содержать много roomStays
// (отдельный номер/койка на каждого гостя), каждый со своей ценой, гостями и
// питанием. Возвращаем строку НА КАЖДЫЙ roomStay, чтобы они корректно
// разложились по комнатам в шахматке, а цена не вешалась вся на один номер.
function mapBookingRows(detail: any): any[] {
  const bk = detail?.booking;
  if (!bk) return [];
  const stays: any[] = bk.roomStays ?? [];
  if (stays.length === 0) return [];

  const number = String(bk.number);
  const status = mapStatus(String(bk.status));
  const source = resolveTlChannel(bk.source);
  const bookingTotal = Math.round(bk.total?.priceAfterTax ?? 0);
  const prepaidTotal = Math.round(bk.guaranteeInfo?.totalPrepaid ?? 0);
  const groupSize = stays.length;

  // Заказчик-организатор (на групповой броне один на всех).
  const orgFirst = masked(bk.customer?.firstName) ? "" : String(bk.customer.firstName);
  const orgLast = masked(bk.customer?.lastName) ? "" : String(bk.customer.lastName);
  const organizer = `${orgLast} ${orgFirst}`.trim();

  return stays.map((rs, i) => {
    const arrivalDT = String(rs.stayDates?.arrivalDateTime ?? "");
    const departureDT = String(rs.stayDates?.departureDateTime ?? "");
    const checkIn = arrivalDT.slice(0, 10);
    const checkOut = departureDT.slice(0, 10);
    if (!checkIn || !checkOut) return null;
    const nights = Math.max(1, Math.round((+new Date(checkOut) - +new Date(checkIn)) / 86400000));
    const roomId = TL_TO_ROOM_ID[Number(rs.roomType?.id)] ?? "unknown";
    const stayTotal = Math.round(rs.total?.priceAfterTax ?? 0);
    // Предоплата распределяется по комнатам пропорционально их стоимости.
    const paidShare = bookingTotal > 0 ? Math.round((prepaidTotal * stayTotal) / bookingTotal) : 0;
    const servicesTotal = Math.round(
      (rs.services ?? []).reduce((s: number, x: any) => s + (x.total?.priceAfterTax ?? 0), 0),
    );

    // Гости конкретного номера.
    const guests = (rs.guests ?? [])
      .map((g: any) => `${g.lastName ?? ""} ${g.firstName ?? ""}`.trim())
      .filter((n: string) => n && !masked(n));
    const occupant = guests[0] || organizer || "Бронь TL";
    const [oLast, ...oRest] = occupant.split(" ");

    const meta = {
      kind: "tl",
      tariff: rs.ratePlans?.[0]?.name ?? "",
      arrival: arrivalDT,
      departure: departureDT,
      prepaid: paidShare,
      servicesTotal,
      guests,
      organizer: organizer && organizer !== occupant ? organizer : "",
      groupSize,
      roomNo: i + 1,
      mealPlan: (rs.services ?? []).find((x: any) => x.kind === "Meal")?.name ?? "",
      sourceUrl: bk.source?.sourceUrl ?? "",
      channelCode: bk.source?.code ?? "",
      bookedAt: bk.createdDateTime ?? "",
    };

    return {
      // Уникальный ключ на каждый номер группы (index уникален в рамках брони).
      tl_reservation_id: `${number}#${rs.index ?? i}`,
      source,
      first_name: oRest.join(" ") || "—",
      last_name: oLast || "Бронь TL",
      phone: "",
      email: "tl@noemail.invalid",
      room_id: roomId,
      room_name: String(rs.roomType?.name ?? roomId),
      check_in: checkIn,
      check_out: checkOut,
      nights,
      adults: Number(rs.guestCount?.adultCount ?? 1),
      children: (rs.guestCount?.childAges ?? []).length,
      meal_plan: "room_only",
      room_price_total: stayTotal,
      prepayment_amount: paidShare,
      remaining_amount: Math.max(0, stayTotal - paidShare),
      total_price: stayTotal,
      payment_status: status,
      id_consent: true,
      terms_consent: true,
      special_requests: meta,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);
}

export const syncTravellineReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      // Used only on the very first run (no cursor yet) as the backfill start.
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

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Resume from the persisted cursor; first ever run starts from `from`.
    const { data: state } = await supabaseAdmin
      .from("tl_sync_state")
      .select("continue_token")
      .eq("id", 1)
      .maybeSingle();
    let cursor: string | null = (state as any)?.continue_token ?? null;

    const PAGE = 40; // details per page (keeps subrequests within Worker limits)
    const MAX_PAGES = 6; // up to ~240 bookings per run; cron keeps catching up
    let totalSynced = 0;
    let caughtUp = false;
    let firstError: string | null = null;

    for (let page = 0; page < MAX_PAGES; page++) {
      try {
        const url = new URL(base);
        url.searchParams.set("count", String(PAGE));
        if (cursor) url.searchParams.set("continueToken", cursor);
        else url.searchParams.set("lastModification", `${data.from}T00:00:00Z`);

        const res = await fetch(url, { headers });
        if (!res.ok) {
          firstError = `summaries ${res.status}: ${(await res.text()).slice(0, 140)}`;
          break;
        }
        const j: any = await res.json();
        const summaries: any[] = j.bookingSummaries ?? [];

        if (summaries.length > 0) {
          const details = await Promise.all(
            summaries.map(async (s) => {
              try {
                const r = await fetch(`${base}/${s.number}`, { headers });
                return r.ok ? await r.json() : null;
              } catch {
                return null;
              }
            }),
          );
          const rows: any[] = [];
          const numbers: string[] = [];
          for (const d of details) {
            const r = mapBookingRows(d);
            if (r.length) {
              rows.push(...r);
              const num = d?.booking?.number;
              if (num) numbers.push(String(num));
            }
          }
          if (rows.length) {
            const { error } = await supabaseAdmin
              .from("bookings")
              .upsert(rows, { onConflict: "tl_reservation_id" });
            if (error) {
              firstError = error.message;
              break;
            }
            totalSynced += rows.length;
            // Удаляем легаси-строки старого формата (ключ = голый номер без #index),
            // оставшиеся от прошлой версии синка (1 строка на всю бронь).
            if (numbers.length) {
              await supabaseAdmin.from("bookings").delete().in("tl_reservation_id", numbers);
            }
          }
        }

        // advance + persist cursor after each successful page
        cursor = j.continueToken ?? cursor;
        await supabaseAdmin
          .from("tl_sync_state")
          .upsert({ id: 1, continue_token: cursor, updated_at: new Date().toISOString() });

        if (!j.hasMoreData) {
          caughtUp = true;
          break;
        }
      } catch (e) {
        firstError = `page ${page}: ${(e as Error).message}`;
        break;
      }
    }

    if (firstError && totalSynced === 0) {
      return { ok: false, error: firstError, synced: 0 };
    }
    return { ok: true, synced: totalSynced, caughtUp, hasMore: !caughtUp };
  });
