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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Загрузка одной детали с повторами и backoff (TL режет лавину запросом 429).
async function fetchDetail(url: string, headers: Record<string, string>): Promise<any | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { headers });
      if (r.ok) return await r.json();
      if (r.status === 429 || r.status >= 500) {
        const ra = Number(r.headers.get("retry-after"));
        await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 400 * Math.pow(2, attempt));
        continue;
      }
      return null; // 4xx (кроме 429) — пропускаем бронь, повтор не поможет
    } catch {
      await sleep(400 * Math.pow(2, attempt));
    }
  }
  return null;
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
      // Необязательно: переопределить старт бэкафилла (по дате модификации).
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      // Окно по дате ЗАЕЗДА: сохраняем только брони, пересекающие [stayFrom, stayTo].
      // Так наполняем нужный сезон (API фильтра по заезду не имеет).
      stayFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      stayTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      // reset=true сбрасывает курсор и тянет заново с начала окна модификаций.
      reset: z.boolean().optional(),
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

    // Resume from the persisted cursor; reset=true начинает заново.
    const { data: state } = await supabaseAdmin
      .from("tl_sync_state")
      .select("continue_token")
      .eq("id", 1)
      .maybeSingle();
    let cursor: string | null = data.reset ? null : ((state as any)?.continue_token ?? null);
    if (data.reset) {
      await supabaseAdmin
        .from("tl_sync_state")
        .upsert({ id: 1, continue_token: null, updated_at: new Date().toISOString() });
    }

    // Выдача TL идёт по ВОЗРАСТАНИЮ даты модификации (старые → новые), фильтра
    // по дате заезда нет. Стартуем с НЕДАВНИХ модификаций (30 дней), чтобы курсор
    // сразу попадал в свежие брони (их меняли/создавали недавно), а не перемалывал
    // месяцами историю. `from` — переопределение (для глубокого импорта).
    const back = new Date();
    back.setDate(back.getDate() - 30);
    const seedFrom = `${(data.from ?? back.toISOString().slice(0, 10))}T00:00:00Z`;

    const PAGE = 10; // деталей за страницу
    const MAX_PAGES = 8; // до ~80 деталей за прогон
    const CONCURRENCY = 2; // мягко — по 2 запроса (иначе TL режет лавину 429)
    let totalSynced = 0;
    let caughtUp = false;
    let firstError: string | null = null;
    // диагностика
    let unknown = 0;
    let minCi = "";
    let maxCi = "";
    let lastMod = "";
    let upsertErrors = 0;
    const cursorStart = (cursor ?? "seed").slice(-8);
    const failedNumbers: string[] = []; // брони, чья деталь не догрузилась (rate-limit)

    for (let page = 0; page < MAX_PAGES; page++) {
      try {
        const url = new URL(base);
        url.searchParams.set("count", String(PAGE));
        if (cursor) url.searchParams.set("continueToken", cursor);
        else url.searchParams.set("lastModification", seedFrom);

        const res = await fetch(url, { headers });
        if (!res.ok) {
          firstError = `summaries ${res.status}: ${(await res.text()).slice(0, 140)}`;
          break;
        }
        const j: any = await res.json();
        const summaries: any[] = j.bookingSummaries ?? [];
        if (summaries.length) lastMod = summaries[summaries.length - 1]?.modifiedDateTime ?? lastMod;

        if (summaries.length > 0) {
          // Грузим детали с ограниченной параллельностью (воркеры берут из общей
          // очереди), чтобы не упереться в лимит подзапросов / rate-limit TL.
          const details: any[] = new Array(summaries.length).fill(null);
          let next = 0;
          const worker = async () => {
            while (next < summaries.length) {
              const idx = next++;
              const d = await fetchDetail(`${base}/${summaries[idx].number}`, headers);
              if (d) details[idx] = d;
              else if (summaries[idx]?.number) failedNumbers.push(String(summaries[idx].number));
            }
          };
          await Promise.all(
            Array.from({ length: Math.min(CONCURRENCY, summaries.length) }, worker),
          );
          // Успешно загруженные брони сохраняем сразу (даже если часть
          // недогрузилась) — апсерт идемпотентен.
          const rows: any[] = [];
          const numbers: string[] = [];
          for (const d of details) {
            let r = mapBookingRows(d);
            // Окно по дате заезда: оставляем только пересекающие [stayFrom, stayTo].
            if (data.stayFrom || data.stayTo) {
              const lo = data.stayFrom ?? "0000-01-01";
              const hi = data.stayTo ?? "9999-12-31";
              r = r.filter((row) => row.check_out > lo && row.check_in <= hi);
            }
            const num = d?.booking?.number;
            if (num) numbers.push(String(num)); // для чистки легаси (даже если строк нет)
            for (const row of r) {
              if (row.room_id === "unknown") unknown++;
              if (!minCi || row.check_in < minCi) minCi = row.check_in;
              if (!maxCi || row.check_in > maxCi) maxCi = row.check_in;
            }
            if (r.length) rows.push(...r);
          }
          if (rows.length) {
            const { error } = await supabaseAdmin
              .from("bookings")
              .upsert(rows, { onConflict: "tl_reservation_id" });
            if (error) {
              // НЕ прерываемся — записываем ошибку и двигаемся дальше, чтобы
              // одна битая страница не блокировала весь синк.
              firstError = `upsert: ${error.message}`;
              upsertErrors++;
            } else {
              totalSynced += rows.length;
              // Удаляем легаси-строки старого формата (ключ = голый номер без #index).
              if (numbers.length) {
                await supabaseAdmin.from("bookings").delete().in("tl_reservation_id", numbers);
              }
            }
          }
        }

        // ВСЕГДА двигаем курсор вперёд — не застреваем на сбойной брони.
        // Сбойные (rate-limit/таймаут) собираем в failedNumbers и докачиваем
        // отдельным проходом в конце; если так и не вышло — показываем их.
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

    // Докачиваем сбойные брони отдельным мягким проходом (rate-limit обычно уже
    // спал). Что так и не вышло — показываем в ответе, но синк не блокируем.
    const stillFailed: string[] = [];
    const uniqFailed = [...new Set(failedNumbers)];
    for (const num of uniqFailed) {
      const d = await fetchDetail(`${base}/${num}`, headers);
      if (!d) {
        stillFailed.push(num);
        continue;
      }
      let r = mapBookingRows(d);
      if (data.stayFrom || data.stayTo) {
        const lo = data.stayFrom ?? "0000-01-01";
        const hi = data.stayTo ?? "9999-12-31";
        r = r.filter((row) => row.check_out > lo && row.check_in <= hi);
      }
      if (r.length) {
        const { error } = await supabaseAdmin
          .from("bookings")
          .upsert(r, { onConflict: "tl_reservation_id" });
        if (!error) {
          totalSynced += r.length;
          await supabaseAdmin.from("bookings").delete().in("tl_reservation_id", [num]);
        } else stillFailed.push(num);
      }
    }

    const diag = {
      unknown,
      minCi,
      maxCi,
      lastMod: lastMod.slice(0, 16),
      skipped: stillFailed.length,
      skippedSample: stillFailed.slice(0, 5),
      upsertErrors,
      cursorFrom: cursorStart, // хвост курсора НА ВХОДЕ
      cursorTo: (cursor ?? "seed").slice(-8), // хвост курсора НА ВЫХОДЕ — должен меняться
    };
    if (firstError && totalSynced === 0) {
      return { ok: false, error: firstError, synced: 0, ...diag };
    }
    return { ok: true, synced: totalSynced, caughtUp, hasMore: !caughtUp, ...diag };
  });
