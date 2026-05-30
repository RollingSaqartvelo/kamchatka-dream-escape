import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export const Route = createFileRoute("/api/public/voucher/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const url = new URL(request.url);
          const email = url.searchParams.get("e") ?? "test@example.com";
          const isDemo = params.id === "test";

          let b: any;
          if (isDemo) {
            b = {
              booking_number: "TEST-0001",
              first_name: "Ivan",
              last_name: "Testovy",
              salutation: "mr",
              phone: "+7 (914) 000-00-00",
              email,
              room_name: "Standart Delyuks",
              check_in: "2026-07-01",
              check_out: "2026-07-05",
              nights: 4,
              adults: 2,
              children: 0,
              meal_plan: "breakfast",
              total_price: 24000,
              prepayment_amount: 8000,
            };
          } else {
            const db = createClient(
              process.env.SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
              { auth: { persistSession: false } },
            );
            const { data } = await db
              .from("bookings")
              .select("booking_number,first_name,last_name,salutation,phone,email,room_name,check_in,check_out,nights,adults,children,meal_plan,total_price,prepayment_amount")
              .eq("id", params.id)
              .ilike("email", email)
              .single();
            if (!data) return new Response("Not found", { status: 404 });
            // Транслитерируем для PDF (pdf-lib не поддерживает кириллицу без доп. шрифта)
            b = {
              ...data,
              first_name: transliterate(data.first_name ?? ""),
              last_name: transliterate(data.last_name ?? ""),
              room_name: transliterate(data.room_name ?? ""),
            };
          }

          const pdfBytes = await buildPdf(b, params.id, email);

          return new Response(pdfBytes, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="voucher-${b.booking_number}.pdf"`,
              "Cache-Control": "no-store",
            },
          });
        } catch (e) {
          console.error("Voucher PDF error:", e);
          return new Response(`Error: ${(e as Error).message}`, { status: 500 });
        }
      },
    },
  },
});

// Простая транслитерация для PDF-шрифта (Helvetica не поддерживает кириллицу)
function transliterate(s: string): string {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
    х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
    А:"A",Б:"B",В:"V",Г:"G",Д:"D",Е:"E",Ё:"Yo",Ж:"Zh",З:"Z",И:"I",Й:"Y",
    К:"K",Л:"L",М:"M",Н:"N",О:"O",П:"P",Р:"R",С:"S",Т:"T",У:"U",Ф:"F",
    Х:"Kh",Ц:"Ts",Ч:"Ch",Ш:"Sh",Щ:"Sch",Ъ:"",Ы:"Y",Ь:"",Э:"E",Ю:"Yu",Я:"Ya",
  };
  return s.split("").map(c => map[c] ?? c).join("");
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return iso; }
}

async function buildPdf(b: any, bookingId: string, email: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // A4 landscape: 841.89 x 595.28 pt
  const page = doc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);

  const NAVY = rgb(0.102, 0.102, 0.18);
  const GOLD = rgb(0.788, 0.663, 0.431);
  const LIGHT = rgb(0.961, 0.949, 0.933);
  const WHITE = rgb(1, 1, 1);
  const GREY = rgb(0.6, 0.6, 0.6);
  const BORDER = rgb(0.91, 0.894, 0.871);

  // ── Шапка ──
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: NAVY });

  page.drawText("HOTEL", { x: 30, y: height - 22, font: helvetica, size: 8, color: GOLD });
  page.drawText("POLUOSTROV", { x: 30, y: height - 45, font: helveticaBold, size: 24, color: WHITE });
  page.drawText("Petropavlovsk-Kamchatsky", { x: 30, y: height - 65, font: helvetica, size: 9, color: GREY });

  page.drawText("VOUCHER", { x: width - 170, y: height - 22, font: helvetica, size: 8, color: GOLD });
  page.drawText(b.booking_number, { x: width - 170, y: height - 44, font: helveticaBold, size: 18, color: WHITE });
  page.drawText("+7 (914) 994-57-57", { x: width - 170, y: height - 65, font: helvetica, size: 9, color: GREY });

  // ── Детали брони ──
  page.drawRectangle({ x: 0, y: height - 150, width, height: 70, color: LIGHT });

  const cols = [
    { label: "ROOM TYPE", value: b.room_name, x: 0, w: 200 },
    { label: "CHECK-IN", value: fmtDate(b.check_in), sub: "from 14:00", x: 200, w: 110 },
    { label: "CHECK-OUT", value: fmtDate(b.check_out), sub: "until 12:00", x: 310, w: 110 },
    { label: "NIGHTS", value: String(b.nights), x: 420, w: 80 },
    { label: "GUESTS", value: `${b.adults} adult${b.children ? ` + ${b.children} child` : ""}`, x: 500, w: 130 },
    { label: "MEAL PLAN", value: b.meal_plan === "breakfast" ? "Breakfast incl." : "Room only", x: 630, w: 211 },
  ];

  for (const col of cols) {
    page.drawText(col.label, { x: col.x + 14, y: height - 100, font: helvetica, size: 7, color: GREY });
    page.drawText(col.value, { x: col.x + 14, y: height - 118, font: helveticaBold, size: 11, color: NAVY, maxWidth: col.w - 14 });
    if (col.sub) page.drawText(col.sub, { x: col.x + 14, y: height - 133, font: helvetica, size: 8, color: GREY });
    if (col.x + col.w < width) {
      page.drawLine({ start: { x: col.x + col.w, y: height - 83 }, end: { x: col.x + col.w, y: height - 150 }, thickness: 0.5, color: BORDER });
    }
  }

  // ── Разделитель ──
  page.drawLine({ start: { x: 0, y: height - 152 }, end: { x: width, y: height - 152 }, thickness: 2, color: GOLD });

  // ── Заголовок таблицы гостей ──
  page.drawText("GUEST LIST", { x: 20, y: height - 170, font: helveticaBold, size: 8, color: NAVY });

  // ── Заголовки таблицы ──
  page.drawRectangle({ x: 0, y: height - 200, width, height: 22, color: NAVY });
  const headers = [
    { t: "TITLE", x: 20 }, { t: "LAST NAME", x: 70 }, { t: "FIRST NAME", x: 220 },
    { t: "PHONE", x: 370 }, { t: "EMAIL", x: 530 },
  ];
  for (const h of headers) {
    page.drawText(h.t, { x: h.x, y: height - 194, font: helveticaBold, size: 7, color: WHITE });
  }

  // ── Строка гостя ──
  page.drawRectangle({ x: 0, y: height - 228, width, height: 28, color: WHITE });
  const salut = b.salutation === "mrs" ? "MRS." : "MR.";
  const rowData = [
    { t: salut, x: 20 },
    { t: (b.last_name ?? "").toUpperCase(), x: 70 },
    { t: (b.first_name ?? "").toUpperCase(), x: 220 },
    { t: b.phone ?? "", x: 370 },
    { t: (b.email ?? "").slice(0, 35), x: 530 },
  ];
  for (const r of rowData) {
    page.drawText(r.t, { x: r.x, y: height - 218, font: helvetica, size: 9, color: NAVY });
  }

  // ── Итого + адрес + QR ──
  page.drawRectangle({ x: 0, y: height - 300, width, height: 72, color: LIGHT });
  page.drawLine({ start: { x: 0, y: height - 228 }, end: { x: width, y: height - 228 }, thickness: 2, color: GOLD });

  const total = new Intl.NumberFormat("en-US").format(b.total_price);
  const prepay = new Intl.NumberFormat("en-US").format(b.prepayment_amount ?? 0);

  page.drawText("TOTAL", { x: 20, y: height - 248, font: helvetica, size: 7, color: GREY });
  page.drawText(`RUB ${total}`, { x: 20, y: height - 264, font: helveticaBold, size: 18, color: GOLD });
  page.drawText("Prepayment", { x: 20, y: height - 282, font: helvetica, size: 7, color: GREY });
  page.drawText(`RUB ${prepay}`, { x: 20, y: height - 295, font: helveticaBold, size: 11, color: NAVY });

  page.drawText("Hotel Poluostrov", { x: 240, y: height - 248, font: helveticaBold, size: 9, color: NAVY });
  page.drawText("ul. Abelya, 41, Petropavlovsk-Kamchatsky", { x: 240, y: height - 262, font: helvetica, size: 8, color: GREY });
  page.drawText("+7 (914) 994-57-57", { x: 240, y: height - 276, font: helvetica, size: 8, color: GREY });
  page.drawText("kamchatka-dream-escape.lovable.app", { x: 240, y: height - 290, font: helvetica, size: 8, color: GOLD });

  // QR код
  try {
    const chatUrl = `https://kamchatka-dream-escape.lovable.app/booking/chat/${bookingId}?e=${encodeURIComponent(email)}`;
    const qrDataUrl = await QRCode.toDataURL(chatUrl, { width: 64, margin: 1 });
    const qrBase64 = qrDataUrl.replace("data:image/png;base64,", "");
    const qrBytes = Uint8Array.from(atob(qrBase64), c => c.charCodeAt(0));
    const qrImage = await doc.embedPng(qrBytes);
    page.drawImage(qrImage, { x: width - 90, y: height - 295, width: 64, height: 64 });
    page.drawText("CHECK-IN", { x: width - 90, y: height - 307, font: helvetica, size: 7, color: GREY });
  } catch {}

  // ── Нижняя полоса ──
  page.drawRectangle({ x: 0, y: 0, width, height: 22, color: NAVY });
  const today = new Date().toLocaleDateString("en-GB");
  page.drawText(`Generated: ${today}`, { x: 20, y: 7, font: helvetica, size: 7, color: GREY });
  page.drawText("This document confirms the hotel reservation", { x: width - 330, y: 7, font: helvetica, size: 7, color: GOLD });

  return doc.save();
}
