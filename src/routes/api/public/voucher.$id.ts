import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";

export const Route = createFileRoute("/api/public/voucher/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const email = url.searchParams.get("e") ?? "test@example.com";

        // Демо-режим
        const isDemo = params.id === "test";
        let b: any;

        if (isDemo) {
          b = {
            booking_number: "TEST-0001",
            first_name: "Иван",
            last_name: "Тестовый",
            salutation: "mr",
            phone: "+7 (914) 000-00-00",
            email,
            room_name: "Стандарт Делюкс",
            check_in: "2026-07-01",
            check_out: "2026-07-05",
            nights: 4,
            adults: 2,
            children: 0,
            meal_plan: "breakfast",
            total_price: 24000,
            prepayment_amount: 8000,
            payment_status: "confirmed",
          };
        } else {
          const db = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } },
          );
          const { data } = await db
            .from("bookings")
            .select("booking_number,first_name,last_name,salutation,phone,email,room_name,check_in,check_out,nights,adults,children,meal_plan,total_price,prepayment_amount,payment_status")
            .eq("id", params.id)
            .ilike("email", email)
            .single();
          if (!data) return new Response("Not found", { status: 404 });
          b = data;
        }

        const chatUrl = `https://kamchatka-dream-escape.lovable.app/booking/chat/${params.id}?e=${encodeURIComponent(email)}`;
        const qrDataUrl = await QRCode.toDataURL(chatUrl, { width: 80, margin: 1 });
        const qrBase64 = qrDataUrl.replace("data:image/png;base64,", "");

        const pdfBuffer = await buildPdf(b, qrBase64);

        return new Response(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="voucher-${b.booking_number}.pdf"`,
          },
        });
      },
    },
  },
});

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function buildPdf(b: any, qrBase64: string): Promise<Buffer> {
  // Динамический импорт pdfkit (Node.js only)
  const PDFDocument = (await import("pdfkit")).default;

  // Подгружаем шрифт с поддержкой кириллицы
  const fontRes = await fetch(
    "https://fonts.gstatic.com/s/notosans/v36/o-0IIpQlx3QUlC5A4PNr5TRASKapck4iTgt9SO8.ttf",
  );
  const fontBuf = Buffer.from(await fontRes.arrayBuffer());

  const doc = new PDFDocument({ layout: "landscape", size: "A4", margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const W = 841.89;
  const NAVY = "#1a1a2e";
  const GOLD = "#C9A96E";
  const LIGHT = "#f5f2ee";
  const BORDER = "#e8e4de";

  doc.registerFont("NotoSans", fontBuf);
  doc.registerFont("NotoSansBold", fontBuf);

  // ── Шапка ──
  doc.rect(0, 0, W, 80).fill(NAVY);
  doc.fillColor(GOLD).font("NotoSans").fontSize(8).text("ГОСТИНИЦА", 30, 18, { characterSpacing: 3 });
  doc.fillColor("#ffffff").font("NotoSansBold").fontSize(26).text("ПОЛУОСТРОВ", 30, 28);
  doc.fillColor("#888888").font("NotoSans").fontSize(9).text("Петропавловск-Камчатский", 30, 58);
  doc.fillColor(GOLD).font("NotoSans").fontSize(8).text("ВАУЧЕР", W - 200, 22, { align: "right", width: 170, characterSpacing: 2 });
  doc.fillColor("#ffffff").font("NotoSansBold").fontSize(18).text(b.booking_number, W - 200, 34, { align: "right", width: 170 });
  doc.fillColor("#cccccc").font("NotoSans").fontSize(9).text("+7 (914) 994-57-57", W - 200, 58, { align: "right", width: 170 });

  // ── Детали брони ──
  const cols = [
    { label: "ТИП НОМЕРА", value: b.room_name, w: 180 },
    { label: "ЗАЕЗД", value: fmt(b.check_in), sub: "с 14:00", w: 100 },
    { label: "ВЫЕЗД", value: fmt(b.check_out), sub: "до 12:00", w: 100 },
    { label: "НОЧЕЙ", value: String(b.nights), w: 70 },
    { label: "ГОСТЕЙ", value: `${b.adults} взр.${b.children ? ` + ${b.children} дет.` : ""}`, w: 100 },
    { label: "ПИТАНИЕ", value: b.meal_plan === "breakfast" ? "Завтрак включён" : "Без питания", w: 150 },
  ];
  doc.rect(0, 80, W, 60).fill(LIGHT);
  let cx = 0;
  for (const col of cols) {
    doc.fillColor("#999999").font("NotoSans").fontSize(7).text(col.label, cx + 14, 92, { characterSpacing: 1 });
    doc.fillColor(NAVY).font("NotoSansBold").fontSize(11).text(col.value, cx + 14, 104, { width: col.w - 14 });
    if (col.sub) doc.fillColor("#999999").font("NotoSans").fontSize(8).text(col.sub, cx + 14, 120);
    if (cx + col.w < W) doc.moveTo(cx + col.w, 84).lineTo(cx + col.w, 136).stroke(BORDER);
    cx += col.w;
  }

  // ── Заголовок гостей ──
  doc.moveTo(0, 140).lineTo(W, 140).stroke(GOLD).lineWidth(2);
  doc.fillColor(NAVY).font("NotoSansBold").fontSize(8).text("СПИСОК ГОСТЕЙ", 20, 147, { characterSpacing: 2 });

  // ── Таблица ──
  doc.rect(0, 162, W, 22).fill(NAVY);
  const headers = [
    { t: "ПОЛ", x: 20, w: 50 },
    { t: "ФАМИЛИЯ", x: 70, w: 150 },
    { t: "ИМЯ", x: 220, w: 150 },
    { t: "ТЕЛЕФОН", x: 370, w: 160 },
    { t: "EMAIL", x: 530, w: 291 },
  ];
  for (const h of headers) {
    doc.fillColor("#ffffff").font("NotoSansBold").fontSize(7).text(h.t, h.x, 170, { width: h.w, characterSpacing: 1 });
  }
  doc.rect(0, 184, W, 28).fill("#ffffff");
  const salut = b.salutation === "mrs" ? "MRS." : "MR.";
  const rowData = [
    { t: salut, x: 20, w: 50 },
    { t: (b.last_name ?? "").toUpperCase(), x: 70, w: 150 },
    { t: (b.first_name ?? "").toUpperCase(), x: 220, w: 150 },
    { t: b.phone ?? "", x: 370, w: 160 },
    { t: b.email ?? "", x: 530, w: 291 },
  ];
  for (const r of rowData) {
    doc.fillColor(NAVY).font("NotoSans").fontSize(9).text(r.t, r.x, 192, { width: r.w });
  }

  // ── Итого + адрес + QR ──
  doc.rect(0, 215, W, 60).fill(LIGHT);
  doc.moveTo(0, 215).lineTo(W, 215).stroke(GOLD).lineWidth(2);

  const total = new Intl.NumberFormat("ru-RU").format(b.total_price);
  const prepay = new Intl.NumberFormat("ru-RU").format(b.prepayment_amount ?? 0);
  doc.fillColor("#999").font("NotoSans").fontSize(7).text("ИТОГО К ОПЛАТЕ", 20, 224, { characterSpacing: 1 });
  doc.fillColor(GOLD).font("NotoSansBold").fontSize(20).text(`₽ ${total}`, 20, 234);
  doc.fillColor("#999").font("NotoSans").fontSize(7).text("Предоплата", 20, 258);
  doc.fillColor(NAVY).font("NotoSansBold").fontSize(11).text(`₽ ${prepay}`, 20, 267);

  doc.fillColor("#666").font("NotoSans").fontSize(9)
    .text("Гостиница «Полуостров»", 240, 225)
    .text("ул. Абеля, 41, Петропавловск-Камчатский", 240, 238)
    .text("+7 (914) 994-57-57", 240, 251);

  // QR
  const qrImg = Buffer.from(qrBase64, "base64");
  doc.image(qrImg, W - 100, 218, { width: 70, height: 70 });
  doc.fillColor("#999").font("NotoSans").fontSize(7).text("ЧЕКИН", W - 100, 291, { width: 70, align: "center" });

  // ── Нижняя полоса ──
  doc.rect(0, 278, W, 20).fill(NAVY);
  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  doc.fillColor("#555").font("NotoSans").fontSize(7).text(`Документ сформирован: ${today}`, 20, 285);
  doc.fillColor(GOLD).font("NotoSans").fontSize(7).text("Данный документ является подтверждением бронирования", 0, 285, { align: "right", width: W - 20 });

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
