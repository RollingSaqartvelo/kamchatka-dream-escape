import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/admin/companies")({
  component: CompaniesPage,
  head: () => ({
    meta: [
      { title: "Юр. лица — Админка «Полуостров»" },
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
  payment_status: string;
  special_requests: unknown;
};

type Company = { key: string; name: string; inn: string; bookings: Bk[]; total: number };

function metaOf(b: Bk): { company?: string; inn?: string } {
  const sr = b.special_requests;
  if (sr && typeof sr === "object" && !Array.isArray(sr)) return sr as any;
  return {};
}

const fmtRub = (n: number) => `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;
const fmtDate = (iso: string) => {
  try { return format(parseISO(iso), "d MMM yyyy", { locale: ru }); } catch { return iso; }
};

function CompaniesPage() {
  const { isStaff, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Bk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    void supabase
      .from("bookings")
      .select("id,booking_number,first_name,last_name,room_name,check_in,check_out,nights,total_price,payment_status,special_requests")
      .order("check_in", { ascending: false })
      .limit(3000)
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setRows((data as Bk[]) ?? []);
        setLoading(false);
      });
  }, []);

  const companies = useMemo<Company[]>(() => {
    const map = new Map<string, Company>();
    for (const b of rows) {
      const m = metaOf(b);
      const name = (m.company ?? "").trim();
      if (!name) continue;
      const inn = (m.inn ?? "").trim();
      const key = `${name.toLowerCase()}|${inn}`;
      let c = map.get(key);
      if (!c) { c = { key, name, inn, bookings: [], total: 0 }; map.set(key, c); }
      c.bookings.push(b);
      c.total += b.total_price ?? 0;
    }
    return [...map.values()].sort((a, b) => b.bookings.length - a.bookings.length);
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(s) || c.inn.includes(s));
  }, [companies, q]);

  const current = companies.find((c) => c.key === selected) ?? null;

  if (authLoading) return null;
  if (!isStaff) {
    return <div className="mx-auto max-w-2xl px-6 py-20 text-center"><h1 className="font-serif text-3xl text-navy">Доступ запрещён</h1></div>;
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">Документооборот</p>
        <h1 className="mt-2 font-serif text-4xl text-navy">Юр. лица</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Корпоративные клиенты (ИП/ООО) из брони. Откройте компанию → бронь → сформируйте счёт или УПД.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Загрузка…</p>
        ) : current ? (
          /* ── Брони выбранной компании ── */
          <div className="mt-6">
            <button onClick={() => setSelected(null)} className="text-[11px] uppercase tracking-widest text-navy hover:text-[#C9A96E]">← Все юр. лица</button>
            <h2 className="mt-3 font-serif text-2xl text-navy">{current.name}</h2>
            <p className="text-sm text-muted-foreground">{current.inn ? `ИНН ${current.inn} · ` : ""}{current.bookings.length} броней · {fmtRub(current.total)}</p>
            <div className="mt-5 overflow-hidden border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-cream/40">
                  <tr>
                    <th className="px-4 py-2 text-[11px] uppercase tracking-widest text-navy">Бронь</th>
                    <th className="px-4 py-2 text-[11px] uppercase tracking-widest text-navy">Гость / номер</th>
                    <th className="px-4 py-2 text-[11px] uppercase tracking-widest text-navy">Даты</th>
                    <th className="px-4 py-2 text-[11px] uppercase tracking-widest text-navy">Сумма</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {current.bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-cream/20">
                      <td className="px-4 py-3 font-mono text-xs text-navy">{b.booking_number ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="text-navy">{`${b.last_name ?? ""} ${b.first_name ?? ""}`.trim() || "Гость"}</div>
                        <div className="text-xs text-muted-foreground">{b.room_name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(b.check_in)} — {fmtDate(b.check_out)}</td>
                      <td className="px-4 py-3 text-navy">{fmtRub(b.total_price ?? 0)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to="/admin/document/$id" params={{ id: b.id }} className="border border-navy px-3 py-1.5 text-[10px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream">
                          Счёт / УПД
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── Список юр. лиц ── */
          <div className="mt-6">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="🔍 Поиск по названию или ИНН"
              className="mb-4 w-72 border border-border bg-background px-3 py-2 text-sm text-navy outline-none focus:border-navy"
            />
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Юр. лица не найдены. Они появляются из корпоративных броней (поле «компания»).</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((c) => (
                  <button key={c.key} onClick={() => setSelected(c.key)} className="border border-border bg-background p-4 text-left hover:border-navy">
                    <div className="font-serif text-lg text-navy">{c.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{c.inn ? `ИНН ${c.inn}` : "ИНН не указан"}</div>
                    <div className="mt-2 text-[11px] uppercase tracking-widest text-[#C9A96E]">{c.bookings.length} броней · {fmtRub(c.total)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
