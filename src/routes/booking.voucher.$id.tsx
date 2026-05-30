import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { useServerFn } from "@tanstack/react-start";
import { getGuestChat } from "@/lib/inbox.functions";
import { VoucherDocument, type VoucherData } from "@/lib/voucher";

export const Route = createFileRoute("/booking/voucher/$id")({
  validateSearch: z.object({ e: z.string().optional() }),
  component: VoucherPage,
  head: () => ({ meta: [{ title: "Ваучер — Гостиница Полуостров" }] }),
});

function VoucherPage() {
  const { id } = Route.useParams();
  const { e: emailParam } = Route.useSearch();
  const [data, setData] = useState<VoucherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const getChatFn = useServerFn(getGuestChat);

  useEffect(() => {
    if (!emailParam) { setError("Ссылка недействительна"); setLoading(false); return; }
    getChatFn({ data: { bookingId: id, email: decodeURIComponent(emailParam) } })
      .then((res) => {
        if (!res.booking) { setError("Бронирование не найдено"); return; }
        const b = res.booking as any;
        setData({
          booking_number: b.booking_number ?? id.slice(0, 8).toUpperCase(),
          first_name: b.first_name ?? "",
          last_name: b.last_name ?? "",
          salutation: b.salutation,
          phone: b.phone ?? "",
          email: decodeURIComponent(emailParam),
          room_name: b.room_name ?? "",
          check_in: b.check_in ?? "",
          check_out: b.check_out ?? "",
          nights: b.nights ?? 1,
          adults: b.adults ?? 1,
          children: b.children ?? 0,
          meal_plan: b.meal_plan ?? "room_only",
          total_price: b.total_price ?? 0,
          prepayment_amount: b.prepayment_amount ?? 0,
          payment_status: b.payment_status ?? "confirmed",
          booking_id: id,
        });
      })
      .catch(() => setError("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [id, emailParam]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-cream text-sm text-zinc-400">Загрузка…</div>
  );

  if (error || !data) return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
      <div>
        <p className="font-serif text-2xl text-navy mb-3">{error || "Не найдено"}</p>
        <Link to="/" className="text-[11px] uppercase tracking-widest text-[#C9A96E]">← На главную</Link>
      </div>
    </div>
  );

  const filename = `voucher-${data.booking_number}.pdf`;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-[#1a1a2e] px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-white font-serif text-xl">Полуостров</Link>
        <PDFDownloadLink
          document={<VoucherDocument b={data} />}
          fileName={filename}
          className="bg-[#C9A96E] px-6 py-2 text-[11px] uppercase tracking-widest text-white hover:opacity-90"
        >
          {({ loading: l }) => l ? "Подготовка…" : "⬇ Скачать PDF"}
        </PDFDownloadLink>
      </header>

      <div className="flex-1 p-4">
        <PDFViewer width="100%" height={600} showToolbar={false} style={{ border: "none" }}>
          <VoucherDocument b={data} />
        </PDFViewer>
      </div>
    </div>
  );
}
