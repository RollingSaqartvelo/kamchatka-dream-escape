import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { useRequisites } from "@/lib/requisites";

type DocType = "invoice" | "upd" | "sf";

export const Route = createFileRoute("/admin/document/$id")({
  validateSearch: (s: Record<string, unknown>): { type?: DocType } => {
    const t = s.type;
    return t === "upd" || t === "sf" || t === "invoice" ? { type: t } : {};
  },
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
  company_id: string | null;
};

type Co = { name: string; inn: string | null; kpp: string | null; ogrn: string | null; legal_address: string | null };

const fmt = (n: number) => new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const dmy = (iso: string) => { try { return format(parseISO(iso), "d MMMM yyyy", { locale: ru }); } catch { return iso; } };

function DocumentPage() {
  const { id } = Route.useParams();
  const { type } = Route.useSearch();
  const { isStaff, loading: authLoading } = useAuth();
  const r = useRequisites();
  const [b, setB] = useState<Bk | null>(null);
  const [co, setCo] = useState<Co | null>(null);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState<DocType>(type ?? "invoice");
  const [nds, setNds] = useState(0); // 0 = без НДС (УСН), иначе ставка %
  const [outFmt, setOutFmt] = useState<"pdf" | "word">("pdf");

  useEffect(() => {
    void (supabase as any)
      .from("bookings")
      .select("id,booking_number,first_name,last_name,room_name,check_in,check_out,nights,total_price,created_at,special_requests,company_id")
      .eq("id", id)
      .single()
      .then(async ({ data }: any) => {
        const bk = (data as Bk) ?? null;
        setB(bk);
        if (bk?.company_id) {
          const { data: c } = await (supabase as any).from("companies").select("name,inn,kpp,ogrn,legal_address").eq("id", bk.company_id).single();
          setCo((c as Co) ?? null);
        }
        setLoading(false);
      });
  }, [id]);

  if (authLoading || loading) return <div className="p-10 text-sm text-muted-foreground">Загрузка…</div>;
  if (!isStaff) return <div className="p-10 text-center font-serif text-2xl text-navy">Доступ запрещён</div>;
  if (!b) return <div className="p-10 text-center text-muted-foreground">Бронь не найдена</div>;

  const meta = (b.special_requests && typeof b.special_requests === "object" && !Array.isArray(b.special_requests) ? b.special_requests : {}) as any;
  const buyer = (co?.name ?? meta.company ?? "").trim() || "—";
  const buyerInn = (co?.inn ?? meta.inn ?? "").trim();
  const buyerKpp = (co?.kpp ?? "").trim();
  const buyerAddr = (co?.legal_address ?? "").trim();
  const total = b.total_price ?? 0;
  const nights = Math.max(1, b.nights ?? 1);
  const unitPrice = total / nights;
  const ndsSum = nds > 0 ? (total * nds) / (100 + nds) : 0;
  const today = new Date();
  const docNo = b.booking_number || b.id.slice(0, 8);
  const desc = `Услуги по проживанию в гостинице «Полуостров», ${b.room_name ?? "номер"}, ${dmy(b.check_in)} — ${dmy(b.check_out)} (${nights} сут.)`;

  const docTitle = docType === "invoice" ? "Счёт" : docType === "upd" ? "УПД" : "Счёт-фактура";
  const fileBase = `${docTitle} ${docNo}`;

  // Выгрузка документа в Word (.doc) — HTML-обёртка, открывается в MS Word/редакторах.
  const downloadWord = () => {
    const el = document.querySelector(".doc") as HTMLElement | null;
    if (!el) return;
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".no-print").forEach((n) => n.remove());
    const styles =
      "<style>body{font-family:'Times New Roman',serif;font-size:11pt;color:#000;margin:0}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #000;padding:4px;font-size:10pt;vertical-align:top}h1{font-size:14pt;font-weight:bold;margin:0 0 6px}p{margin:3px 0}</style>";
    const html =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'>" +
      styles +
      "</head><body>" +
      clone.innerHTML +
      "</body></html>";
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileBase + ".doc";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="bg-background py-8 print:py-0">
      <style>{`@page { size: A4 landscape; margin: 0; } @media print { header, footer, .no-print { display:none !important; } [id*="lovable" i], [class*="lovable" i], a[href*="lovable" i], gpt-engineer, [id*="gpt-eng" i] { display:none !important; } body { background:#fff !important; } .doc { box-shadow:none !important; border:none !important; margin:0 !important; max-width:100% !important; padding:12mm 14mm !important; } }`}</style>

      {/* Панель управления (не печатается) */}
      <div className="no-print mx-auto mb-6 flex max-w-3xl flex-wrap items-center gap-3 px-4">
        <div className="flex rounded border border-border overflow-hidden text-[11px] uppercase tracking-widest">
          {(["invoice", "upd", "sf"] as const).map((tpe) => (
            <button key={tpe} onClick={() => setDocType(tpe)} className={`px-4 py-2 ${docType === tpe ? "bg-navy text-cream" : "hover:bg-cream/40"}`}>
              {tpe === "invoice" ? "Счёт" : tpe === "upd" ? "УПД" : "Сч-фактура"}
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
        <div className="flex rounded border border-border overflow-hidden text-[11px] uppercase tracking-widest">
          {(["pdf", "word"] as const).map((f) => (
            <button key={f} onClick={() => setOutFmt(f)} className={`px-4 py-2 ${outFmt === f ? "bg-navy text-cream" : "hover:bg-cream/40"}`}>
              {f === "pdf" ? "PDF" : "Word (.doc)"}
            </button>
          ))}
        </div>
        <button onClick={() => (outFmt === "pdf" ? window.print() : downloadWord())} className="ml-auto bg-navy px-5 py-2 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E]">
          {outFmt === "pdf" ? "Скачать / Печать PDF" : "Скачать Word"}
        </button>
      </div>

      <div className="doc mx-auto max-w-3xl border border-border bg-white px-8 py-8 text-sm text-navy sm:px-12">
        {docType === "invoice" && (
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
              <div className="px-4 py-3">
                {buyer}{buyerInn ? `, ИНН ${buyerInn}` : ""}{buyerKpp ? `, КПП ${buyerKpp}` : ""}
                {buyerAddr && <><br />{buyerAddr}</>}
              </div>
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
        )}

        {docType === "upd" && (
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
                {buyer}{buyerInn ? `, ИНН ${buyerInn}` : ""}{buyerKpp ? `, КПП ${buyerKpp}` : ""}
                {buyerAddr && <><br />{buyerAddr}</>}
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

        {docType === "sf" && (
          <>
            <p className="text-right text-[10px] text-muted-foreground">
              Приложение № 1 к постановлению Правительства РФ от 26.12.2011 № 1137
            </p>
            <h1 className="mt-2 font-serif text-xl">
              Счёт-фактура № {docNo} от {dmy(today.toISOString())} <span className="text-xs text-muted-foreground">(1)</span>
            </h1>
            <p className="text-xs text-muted-foreground">Исправление № — от — (1а)</p>

            <div className="mt-3 space-y-0.5 text-xs">
              <p>Продавец: <b>{r.ipName}</b> <span className="text-muted-foreground">(2)</span></p>
              <p>Адрес: {r.legalAddress} <span className="text-muted-foreground">(2а)</span></p>
              <p>ИНН/КПП продавца: {r.inn} <span className="text-muted-foreground">(2б)</span></p>
              <p>Грузоотправитель и его адрес: он же <span className="text-muted-foreground">(3)</span></p>
              <p>Грузополучатель и его адрес: {buyer}{buyerAddr ? `, ${buyerAddr}` : ""} <span className="text-muted-foreground">(4)</span></p>
              <p>К платёжно-расчётному документу № — от — <span className="text-muted-foreground">(5)</span></p>
              <p>Покупатель: <b>{buyer}</b> <span className="text-muted-foreground">(6)</span></p>
              <p>Адрес: {buyerAddr || "—"} <span className="text-muted-foreground">(6а)</span></p>
              <p>ИНН/КПП покупателя: {buyerInn || "—"}{buyerKpp ? `/${buyerKpp}` : ""} <span className="text-muted-foreground">(6б)</span></p>
              <p>Валюта: наименование, код: Российский рубль, 643 <span className="text-muted-foreground">(7)</span></p>
              <p>Идентификатор государственного контракта (при наличии): — <span className="text-muted-foreground">(8)</span></p>
            </div>

            <table className="mt-4 w-full border border-border text-[10px]">
              <thead className="bg-cream/40 text-navy">
                <tr>
                  <th className="border border-border px-1 py-1">№ п/п</th>
                  <th className="border border-border px-1 py-1 text-left">Наименование товара (работ, услуг)</th>
                  <th className="border border-border px-1 py-1">Ед. изм.</th>
                  <th className="border border-border px-1 py-1">Кол-во</th>
                  <th className="border border-border px-1 py-1">Цена за ед.</th>
                  <th className="border border-border px-1 py-1">Стоимость без налога</th>
                  <th className="border border-border px-1 py-1">В т.ч. акциз</th>
                  <th className="border border-border px-1 py-1">Ставка</th>
                  <th className="border border-border px-1 py-1">Сумма налога</th>
                  <th className="border border-border px-1 py-1">Стоимость с налогом</th>
                  <th className="border border-border px-1 py-1">Страна происх.</th>
                  <th className="border border-border px-1 py-1">Рег. № декларации / РНПТ</th>
                </tr>
                <tr className="text-[8px] text-muted-foreground">
                  <td className="border border-border text-center">1</td>
                  <td className="border border-border text-center">1б</td>
                  <td className="border border-border text-center">2 / 2а</td>
                  <td className="border border-border text-center">3</td>
                  <td className="border border-border text-center">4</td>
                  <td className="border border-border text-center">5</td>
                  <td className="border border-border text-center">6</td>
                  <td className="border border-border text-center">7</td>
                  <td className="border border-border text-center">8</td>
                  <td className="border border-border text-center">9</td>
                  <td className="border border-border text-center">10 / 10а</td>
                  <td className="border border-border text-center">11</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border px-1 py-1 text-center">1</td>
                  <td className="border border-border px-1 py-1">{desc}</td>
                  <td className="border border-border px-1 py-1 text-center">сут</td>
                  <td className="border border-border px-1 py-1 text-center">{nights}</td>
                  <td className="border border-border px-1 py-1 text-right">{fmt(unitPrice)}</td>
                  <td className="border border-border px-1 py-1 text-right">{fmt(total - ndsSum)}</td>
                  <td className="border border-border px-1 py-1 text-center">без акциза</td>
                  <td className="border border-border px-1 py-1 text-center">{nds > 0 ? `${nds}%` : "без НДС"}</td>
                  <td className="border border-border px-1 py-1 text-right">{nds > 0 ? fmt(ndsSum) : "без НДС"}</td>
                  <td className="border border-border px-1 py-1 text-right">{fmt(total)}</td>
                  <td className="border border-border px-1 py-1 text-center">—</td>
                  <td className="border border-border px-1 py-1 text-center">—</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="border border-border px-1 py-1 text-right" colSpan={5}>Всего к оплате:</td>
                  <td className="border border-border px-1 py-1 text-right">{fmt(total - ndsSum)}</td>
                  <td className="border border-border px-1 py-1"></td>
                  <td className="border border-border px-1 py-1"></td>
                  <td className="border border-border px-1 py-1 text-right">{nds > 0 ? fmt(ndsSum) : "—"}</td>
                  <td className="border border-border px-1 py-1 text-right">{fmt(total)}</td>
                  <td className="border border-border px-1 py-1" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-8 grid grid-cols-2 gap-8 text-xs">
              <div>
                <p>Руководитель организации<br />или иное уполномоченное лицо ____________ <span className="text-muted-foreground">/ Смирнов Р.Я. /</span></p>
                <p className="mt-3">Главный бухгалтер<br />или иное уполномоченное лицо ____________</p>
              </div>
              <div>
                <p>Индивидуальный предприниматель<br />или иное уполномоченное лицо ____________ <span className="text-muted-foreground">/ Смирнов Р.Я. /</span></p>
                <p className="mt-3 text-[10px] text-muted-foreground">
                  Реквизиты свидетельства о государственной регистрации ИП: {r.ogrnip || "—"}
                </p>
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
