import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { getGuestChat } from "@/lib/inbox.functions";

async function downloadVoucherPdf(element: HTMLElement, filename: string) {
  const html2canvas = (await import("html2canvas")).default;
  const jsPDF = (await import("jspdf")).jsPDF;
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = canvas.width / canvas.height;
  const imgH = pageW / ratio;
  const topMargin = Math.max(0, (pageH - imgH) / 2);
  pdf.addImage(imgData, "PNG", 0, topMargin, pageW, imgH);
  pdf.save(filename);
}

export const Route = createFileRoute("/booking_/voucher/$id")({
  validateSearch: z.object({ e: z.string().optional() }),
  component: VoucherPage,
  head: () => ({ meta: [{ title: "Ваучер — Гостиница Полуостров" }] }),
});

const DEMO = {
  booking_number: "TEST-0001",
  first_name: "Иван",
  last_name: "Тестовый",
  salutation: "mr",
  phone: "+7 (914) 000-00-00",
  email: "test@example.com",
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

type BookingData = typeof DEMO;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtLong(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function VoucherPage() {
  const { id } = Route.useParams();
  const { e: emailParam } = Route.useSearch();
  const isDemo = id === "test-id";
  const [data, setData] = useState<BookingData | null>(isDemo ? DEMO : null);
  const [loading, setLoading] = useState(!isDemo);
  const [downloading, setDownloading] = useState(false);
  const voucherRef = useRef<HTMLDivElement>(null);
  const getChatFn = useServerFn(getGuestChat);

  async function handleDownload() {
    if (!voucherRef.current || !data) return;
    setDownloading(true);
    try {
      await downloadVoucherPdf(voucherRef.current, `voucher-${data.booking_number}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    if (isDemo) {
      setData(DEMO);
      setLoading(false);
      return;
    }
    if (!emailParam) { setData(null); setLoading(false); return; }
    getChatFn({ data: { bookingId: id, email: decodeURIComponent(emailParam) } })
      .then((res) => {
        if (res.booking) setData(res.booking as any);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, emailParam]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-cream text-sm text-zinc-400">Загрузка…</div>
  );

  if (!data) return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
      <div>
        <p className="font-serif text-2xl text-navy mb-3">Бронирование не найдено</p>
        <Link to="/" className="text-[11px] uppercase tracking-widest text-[#C9A96E]">← На главную</Link>
      </div>
    </div>
  );

  const meal = data.meal_plan === "breakfast" ? "Завтрак включён" : "Без питания";
  const salut = data.salutation === "mrs" ? "MRS." : "MR.";
  const guests = `${data.adults} взр.${data.children ? ` + ${data.children} дет.` : ""}`;
  const qrValue = isDemo
    ? "https://poluostrov-hotel.ru"
    : `https://poluostrov-hotel.ru/booking/chat/${id}?e=${encodeURIComponent(emailParam ?? "")}`;

  return (
    <>
      {/* Кнопки (не печатаются) */}
      <div className="no-print flex items-center justify-between bg-[#1a1a2e] px-6 py-3">
        <Link to="/" className="text-white font-serif text-lg">Полуостров</Link>
        <div className="flex gap-3">
          {!isDemo && emailParam && (
            <Link
              to="/booking/chat/$id"
              params={{ id }}
              search={{ e: emailParam }}
              className="border border-white/30 px-4 py-2 text-[11px] uppercase tracking-widest text-white hover:bg-white/10"
            >
              ✉ Написать нам
            </Link>
          )}
          <button
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="bg-[#C9A96E] px-6 py-2 text-[11px] uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-60"
          >
            {downloading ? "Подготовка…" : "⬇ Скачать PDF"}
          </button>
        </div>
      </div>

      {/* Ваучер */}
      <div className="voucher-wrap bg-white min-h-screen p-8 flex items-start justify-center">
        <div ref={voucherRef} className="voucher w-full max-w-4xl border border-gray-200 shadow-lg">

          {/* Шапка */}
          <div style={{ background: "#1a1a2e", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ color: "#C9A96E", fontSize: 10, letterSpacing: 4, textTransform: "uppercase", margin: 0 }}>Гостиница</p>
              <p style={{ color: "#fff", fontSize: 26, fontFamily: "Georgia, serif", margin: "4px 0 2px", fontWeight: "normal" }}>ПОЛУОСТРОВ</p>
              <p style={{ color: "#888", fontSize: 11, margin: 0, letterSpacing: 1 }}>Петропавловск-Камчатский</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: "#C9A96E", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 4px" }}>Ваучер</p>
              <p style={{ color: "#fff", fontSize: 20, fontWeight: "bold", margin: "0 0 4px", fontFamily: "monospace" }}>{data.booking_number}</p>
              <p style={{ color: "#ccc", fontSize: 11, margin: 0 }}>+7 (914) 994-57-57</p>
            </div>
          </div>

          {/* Детали брони */}
          <div style={{ display: "flex", borderBottom: "1px solid #e8e4de", background: "#f9f7f4" }}>
            {[
              { label: "ТИП НОМЕРА", value: data.room_name },
              { label: "ЗАЕЗД", value: fmt(data.check_in), sub: "с 14:00" },
              { label: "ВЫЕЗД", value: fmt(data.check_out), sub: "до 12:00" },
              { label: "НОЧЕЙ", value: String(data.nights) },
              { label: "ГОСТЕЙ", value: guests },
              { label: "ПИТАНИЕ", value: meal },
            ].map((c, i) => (
              <div key={i} style={{ flex: 1, padding: "12px 14px", borderRight: i < 5 ? "1px solid #e8e4de" : "none" }}>
                <p style={{ color: "#999", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px" }}>{c.label}</p>
                <p style={{ color: "#1a1a2e", fontSize: 12, fontWeight: "bold", margin: 0 }}>{c.value}</p>
                {c.sub && <p style={{ color: "#999", fontSize: 10, margin: "2px 0 0" }}>{c.sub}</p>}
              </div>
            ))}
          </div>

          {/* Список гостей */}
          <div style={{ padding: "0 20px 12px" }}>
            <p style={{ color: "#1a1a2e", fontSize: 9, fontWeight: "bold", letterSpacing: 2, textTransform: "uppercase", borderBottom: "2px solid #C9A96E", padding: "10px 0 6px", margin: "0 0 0" }}>
              Список гостей
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1a1a2e" }}>
                  {["Пол", "Фамилия", "Имя", "Телефон", "Email"].map((h) => (
                    <th key={h} style={{ color: "#fff", fontSize: 9, fontWeight: "bold", letterSpacing: 1, padding: "6px 8px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e8e4de" }}>
                  <td style={{ padding: "8px", fontSize: 11, color: "#1a1a2e" }}>{salut}</td>
                  <td style={{ padding: "8px", fontSize: 11, color: "#1a1a2e", fontWeight: "bold" }}>{data.last_name.toUpperCase()}</td>
                  <td style={{ padding: "8px", fontSize: 11, color: "#1a1a2e" }}>{data.first_name.toUpperCase()}</td>
                  <td style={{ padding: "8px", fontSize: 11, color: "#1a1a2e" }}>{data.phone}</td>
                  <td style={{ padding: "8px", fontSize: 11, color: "#1a1a2e" }}>{data.email}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Итого + QR */}
          <div style={{ display: "flex", alignItems: "center", background: "#f5f2ee", borderTop: "2px solid #C9A96E", padding: "16px 20px" }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#999", fontSize: 9, letterSpacing: 2, margin: "0 0 4px" }}>ИТОГО К ОПЛАТЕ</p>
              <p style={{ color: "#C9A96E", fontSize: 22, fontWeight: "bold", margin: "0 0 6px" }}>
                ₽ {new Intl.NumberFormat("ru-RU").format(data.total_price)}
              </p>
              <p style={{ color: "#999", fontSize: 9, margin: "0 0 2px" }}>Предоплата</p>
              <p style={{ color: "#1a1a2e", fontSize: 13, fontWeight: "bold", margin: 0 }}>
                ₽ {new Intl.NumberFormat("ru-RU").format(data.prepayment_amount)}
              </p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#666", fontSize: 11, lineHeight: 1.8, margin: 0 }}>
                Гостиница «Полуостров»<br />
                ул. Абеля, 41, Петропавловск-Камчатский<br />
                +7 (914) 994-57-57
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrValue)}&color=1a1a2e`}
                alt="QR"
                style={{ width: 80, height: 80, display: "block" }}
              />
              <p style={{ color: "#999", fontSize: 9, letterSpacing: 1, margin: "4px 0 0" }}>ОНЛАЙН-ЧЕКИН</p>
            </div>
          </div>

          {/* Нижняя полоса */}
          <div style={{ background: "#1a1a2e", padding: "8px 20px", display: "flex", justifyContent: "space-between" }}>
            <p style={{ color: "#555", fontSize: 9, margin: 0 }}>
              Документ сформирован: {fmtLong(new Date().toISOString())}
            </p>
            <p style={{ color: "#C9A96E", fontSize: 9, margin: 0 }}>
              Данный документ является подтверждением бронирования
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .voucher-wrap { padding: 0 !important; background: white !important; }
          .voucher { box-shadow: none !important; border: none !important; max-width: 100% !important; }
          @page { margin: 10mm; size: A4 landscape; }
        }
      `}</style>
    </>
  );
}
