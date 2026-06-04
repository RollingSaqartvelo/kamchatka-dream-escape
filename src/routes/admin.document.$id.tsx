import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { useRequisites } from "@/lib/requisites";

export const Route = createFileRoute("/admin/document/$id")({
  component: DocumentPage,
  head: () => ({
    meta: [
      { title: "Документ — Админка «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Bk = {
  id: string;
  booking_number: string | null;
  first_name: string | null;
  last_name: string | null;
  room_name: string | null;
  check_in: string;
  check_out: string;
  nights: number | null;
  total_price: number | null;
  created_at: string | null;
  special_requests: unknown;
};

const fmt = (n: number) => new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const dmy = (iso: string) => { try { return format(parseISO(iso), "d MMMM yyyy", { locale: ru }); } catch { return iso; } };

function DocumentPage() {
  const { id } = Route.useParams();
  const { isStaff, loading: authLoading } = useAuth();
  const r = useRequisites();
  const [b, setB] = useState<Bk | null>(null);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState<"invoice" | "upd">("invoice");
  const [nds, setNds] = useState(0); // 0 = без НДС (УСН), иначе ставка %

  useEffect(() => {
    void supabase
      .from("bookings")
      .select("id,booking_number,first_name,last_name,room_name,check_in,check_out,nights,total_price,created_at,special_requests")
      .eq("id", id)
      .single()
      .then(({ data }) => { setB((data as Bk) ?? null); setLoading(false); });
  }, [id]);

  if (authLoading || loading) return <div className="p-10 text-sm text-muted-foreground">Загрузка…</div>;
  if (!isStaff) return <div className="p-10 text-center font-serif text-2xl text-navy">Доступ запрещён</div>;
  if (!b) return <div className="p-10 text-center text-muted-foreground">Бронь не найдена</div>;

  const meta = (b.special_requests && typeof b.special_requests === "object" && !Array.isArray(b.special_requests) ? b.special_requests : {}) as any;
  const buyer = (meta.company ?? "").trim() || "—";
  const buyerInn = (meta.inn ?? "").trim();
  const total = b.total_price ?? 0;
  const nights = Math.max(1, b.nights ?? 1);
  const unitPrice = total / nights;
  const ndsSum = nds > 0 ? (total * nds) / (100 + nds) : 0;
  const today = new Date();
  const docNo = b.booking_number || b.id.slice(0, 8);
  const desc = `Услуги по проживанию в гостинице «Полуостров», ${b.room_name ?? "номер"}, ${dmy(b.check_in)} — ${dmy(b.check_out)} (${nights} сут.)`;

  return (
    <div className="bg-background py-8 print:py-0">
      <style>{`@media print { header, footer, .no-print { display:none !important; } body { background:#fff !important; } .doc { box-shadow:none !important; border:none !important; margin:0 !important; max-width:100% !important; } }`}</style>

      {/* Панель управления (не печатается) */}
      <div className="no-print mx-auto mb-6 flex max-w-3xl flex-wrap items-center gap-3 px-4">
        <div className="flex rounded border border-border overflow-hidden text-[11px] uppercase tracking-widest">
          {(["invoice", "upd"] as const).map((tpe) => (
            <button key={tpe} onClick={() => setDocType(tpe)} className={`px-4 py-2 ${docType === tpe ? "bg-navy text-cream" : "hover:bg-cream/40"}`}>
              {tpe === "invoice" ? "Счёт" : "УПД"}
            </button>
          ))}
        </div>
        <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
          НДС:{" "}
          <select value={nds} onChange={(e) => setNds(Number(e.target.value))} className="border border-border bg-background px-2 py-1.5 text-xs">
            <option value={0}>Без НДС (УСН)</option>
            <option value={5}>5%</option>
            <option value={10}>10%</option>
            <option value={20}>20%</option>
          </select>
        </label>
        <button onClick={() => window.print()} className="ml-auto bg-navy px-5 py-2 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E]">
          Скачать / Печать PDF
        </button>
      </div>

      <div className="doc mx-auto max-w-3xl border border-border bg-white px-8 py-8 text-sm text-navy sm:px-12">
        {docType === "invoice" ? (
          <>
            <h1 className="font-serif text-2xl">Счёт на оплату № {docNo} от {dmy(today.toISOString())}</h1>
            <div className="mt-6 border border-border">
              <div className="border-b border-border bg-cream/40 px-4 py-2 text-[11px] uppercase tracking-widest text-muted-foreground">Поставщик (Исполнитель)</div>
              <div className="px-4 py-3 leading-relaxed">
                {r.ipName}, ИНН {r.inn}{r.ogrnip ? `, ОГРНИП ${r.ogrnip}` : ""}<br />
                {r.legalAddress} · тел. {r.phone}<br />
                Банк: {r.bankName}, БИК {r.bik}<br />
                Р/с {r.account}, к/с {r.corrAccount}
              </div>
              <div className="border-y border-border bg-cream/40 px-4 py-2 text-[11px] uppercase tracking-widest text-muted-foreground">Покупатель (Заказчик)</div>
              <div className="px-4 py-3">{buyer}{buyerInn ? `, ИНН ${buyerInn}` : ""}</div>
            </div>

            <table className="mt-6 w-full border border-border text-sm">
              <thead className="bg-cream/40 text-[11px] uppercase tracking-wide text-navy">
                <tr>
                  <th className="border border-border px-2 py-2 text-left">№</th>
                  <th className="border border-border px-2 py-2 text-left">Наименование</th>
                  <th className="border border-border px-2 py-2">Кол-во</th>
                  <th className="border border-border px-2 py-2">Ед.</th>
                  <th className="border border-border px-2 py-2 text-right">Цена</th>
                  <th className="border border-border px-2 py-2 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border px-2 py-2">1</td>
                  <td className="border border-border px-2 py-2">{desc}</td>
                  <td className="border border-border px-2 py-2 text-center">{nights}</td>
                  <td className="border border-border px-2 py-2 text-center">сут.</td>
                  <td className="border border-border px-2 py-2 text-right">{fmt(unitPrice)}</td>
                  <td className="border border-border px-2 py-2 text-right">{fmt(total)}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-4 ml-auto w-64 text-right">
              <div className="flex justify-between py-1"><span className="text-muted-foreground">Итого:</span><span>{fmt(total)} ₽</span></div>
              <div className="flex justify-between py-1"><span className="text-muted-foreground">НДС:</span><span>{nds > 0 ? `${fmt(ndsSum)} ₽ (в т.ч. ${nds}%)` : "Без НДС"}</span></div>
              <div className="flex justify-between border-t border-border py-1 font-semibold"><span>Всего к оплате:</span><span>{fmt(total)} ₽</span></div>
            </div>

            <div className="mt-10 flex justify-between text-sm">
              <div>Руководитель / ИП ____________________ <span className="text-muted-foreground">/ Смирнов Р.Я. /</span></div>
              <div>М.П.</div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <h1 className="font-serif text-xl">Универсальный передаточный документ</h1>
              <div className="border border-border px-3 py-1 text-xs">Статус: <b>{nds > 0 ? "1" : "2"}</b></div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{nds > 0 ? "1 — счёт-фактура и передаточный документ (акт)" : "2 — передаточный документ (акт)"}</p>
            <p className="mt-3">Счёт-фактура № {docNo} от {dmy(today.toISOString())}</p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="border border-border p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Продавец</div>
                {r.ipName}, ИНН {r.inn}<br />{r.legalAddress}<br />Р/с {r.account}, {r.bankName}, БИК {r.bik}
              </div>
              <div className="border border-border p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Покупатель</div>
                {buyer}{buyerInn ? `, ИНН ${buyerInn}` : ""}
              </div>
            </div>

            <table className="mt-4 w-full border border-border text-xs">
              <thead className="bg-cream/40 uppercase text-navy">
                <tr>
                  <th className="border border-border px-2 py-2 text-left">Наименование</th>
                  <th className="border border-border px-2 py-2">Кол-во</th>
                  <th className="border border-border px-2 py-2 text-right">Цена</th>
                  <th className="border border-border px-2 py-2 text-right">Стоимость без НДС</th>
                  <th className="border border-border px-2 py-2">Ставка НДС</th>
                  <th className="border border-border px-2 py-2 text-right">Сумма НДС</th>
                  <th className="border border-border px-2 py-2 text-right">Стоимость с НДС</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border px-2 py-2">{desc}</td>
                  <td className="border border-border px-2 py-2 text-center">{nights}</td>
                  <td className="border border-border px-2 py-2 text-right">{fmt(unitPrice)}</td>
                  <td className="border border-border px-2 py-2 text-right">{fmt(total - ndsSum)}</td>
                  <td className="border border-border px-2 py-2 text-center">{nds > 0 ? `${nds}%` : "Без НДС"}</td>
                  <td className="border border-border px-2 py-2 text-right">{nds > 0 ? fmt(ndsSum) : "—"}</td>
                  <td className="border border-border px-2 py-2 text-right">{fmt(total)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="border border-border px-2 py-2 text-right" colSpan={5}>Итого:</td>
                  <td className="border border-border px-2 py-2 text-right">{nds > 0 ? fmt(ndsSum) : "—"}</td>
                  <td className="border border-border px-2 py-2 text-right">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-8 grid grid-cols-2 gap-8 text-xs">
              <div>
                <p>Товар (услуги) передал: ____________________</p>
                <p className="mt-1 text-muted-foreground">{r.ipName} · М.П.</p>
              </div>
              <div>
                <p>Товар (услуги) получил: ____________________</p>
                <p className="mt-1 text-muted-foreground">{buyer}</p>
              </div>
            </div>
          </>
        )}

        <p className="no-print mt-8 text-[10px] text-muted-foreground">
          ⚠️ Шаблон документа. Перед отправкой клиенту проверьте у бухгалтера (особенно НДС и статус УПД).
        </p>
      </div>
    </div>
  );
}
