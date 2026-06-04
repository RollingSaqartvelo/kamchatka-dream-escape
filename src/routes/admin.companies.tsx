import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
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

type Company = {
  id: string;
  name: string;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  legal_address: string | null;
  bank_name: string | null;
  bik: string | null;
  corr_account: string | null;
  account: string | null;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
};

type Bk = {
  id: string;
  booking_number: string | null;
  first_name: string | null;
  last_name: string | null;
  room_name: string | null;
  check_in: string;
  check_out: string;
  total_price: number | null;
};

const EMPTY: Omit<Company, "id"> = {
  name: "", inn: "", kpp: "", ogrn: "", legal_address: "",
  bank_name: "", bik: "", corr_account: "", account: "",
  phone: "", email: "", contact_person: "",
};

const fmtRub = (n: number) => `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;
const fmtDate = (iso: string) => { try { return format(parseISO(iso), "d MMM yyyy", { locale: ru }); } catch { return iso; } };

function CompaniesPage() {
  const { isStaff, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Company | null>(null);
  const [editing, setEditing] = useState<Partial<Company> | null>(null); // форма (новая или редактирование)
  const [bookings, setBookings] = useState<Bk[]>([]);

  function loadCompanies() {
    setLoading(true);
    (supabase as any).from("companies").select("*").order("name").then(({ data, error }: any) => {
      if (error) console.error(error);
      else setCompanies((data as Company[]) ?? []);
      setLoading(false);
    });
  }
  useEffect(loadCompanies, []);

  // Брони выбранного юр. лица
  useEffect(() => {
    if (!selected) { setBookings([]); return; }
    (supabase as any)
      .from("bookings")
      .select("id,booking_number,first_name,last_name,room_name,check_in,check_out,total_price")
      .eq("company_id", selected.id)
      .order("check_in", { ascending: false })
      .then(({ data }: any) => setBookings((data as Bk[]) ?? []));
  }, [selected]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(s) || (c.inn ?? "").includes(s));
  }, [companies, q]);

  async function saveCompany() {
    if (!editing?.name?.trim()) { toast.error("Укажите название"); return; }
    const payload = { ...EMPTY, ...editing, name: editing.name.trim() };
    delete (payload as any).id;
    if (editing.id) {
      const { error } = await (supabase as any).from("companies").update(payload).eq("id", editing.id);
      if (error) return toast.error("Не сохранилось: " + error.message);
      toast.success("Сохранено");
    } else {
      const { error } = await (supabase as any).from("companies").insert(payload);
      if (error) return toast.error("Не добавилось: " + error.message);
      toast.success("Юр. лицо добавлено");
    }
    setEditing(null);
    loadCompanies();
  }

  async function removeCompany(id: string) {
    if (!confirm("Удалить юр. лицо? Привязки к броням снимутся.")) return;
    const { error } = await (supabase as any).from("companies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Удалено");
    setSelected(null);
    loadCompanies();
  }

  if (authLoading) return null;
  if (!isStaff) return <div className="mx-auto max-w-2xl px-6 py-20 text-center"><h1 className="font-serif text-3xl text-navy">Доступ запрещён</h1></div>;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">Документооборот</p>
            <h1 className="mt-2 font-serif text-4xl text-navy">Юр. лица</h1>
          </div>
          <button onClick={() => { setSelected(null); setEditing({ ...EMPTY }); }} className="bg-navy px-5 py-2.5 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E]">
            + Добавить юр. лицо
          </button>
        </div>

        {/* Форма добавления/редактирования */}
        {editing && (
          <div className="mt-6 border border-border bg-cream/30 p-6">
            <h2 className="font-serif text-2xl text-navy">{editing.id ? "Редактировать юр. лицо" : "Новое юр. лицо"}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Наименование*" value={editing.name ?? ""} onChange={(v) => setEditing({ ...editing, name: v })} wide />
              <Field label="ИНН" value={editing.inn ?? ""} onChange={(v) => setEditing({ ...editing, inn: v })} />
              <Field label="КПП" value={editing.kpp ?? ""} onChange={(v) => setEditing({ ...editing, kpp: v })} />
              <Field label="ОГРН / ОГРНИП" value={editing.ogrn ?? ""} onChange={(v) => setEditing({ ...editing, ogrn: v })} />
              <Field label="Юридический адрес" value={editing.legal_address ?? ""} onChange={(v) => setEditing({ ...editing, legal_address: v })} wide />
              <Field label="Телефон" value={editing.phone ?? ""} onChange={(v) => setEditing({ ...editing, phone: v })} />
              <Field label="Email" value={editing.email ?? ""} onChange={(v) => setEditing({ ...editing, email: v })} />
              <Field label="Контактное лицо" value={editing.contact_person ?? ""} onChange={(v) => setEditing({ ...editing, contact_person: v })} wide />
              <Field label="Банк" value={editing.bank_name ?? ""} onChange={(v) => setEditing({ ...editing, bank_name: v })} wide />
              <Field label="БИК" value={editing.bik ?? ""} onChange={(v) => setEditing({ ...editing, bik: v })} />
              <Field label="Корр. счёт" value={editing.corr_account ?? ""} onChange={(v) => setEditing({ ...editing, corr_account: v })} />
              <Field label="Расчётный счёт" value={editing.account ?? ""} onChange={(v) => setEditing({ ...editing, account: v })} wide />
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => void saveCompany()} className="bg-navy px-6 py-2.5 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E]">Сохранить</button>
              <button onClick={() => setEditing(null)} className="border border-border px-6 py-2.5 text-[11px] uppercase tracking-widest text-muted-foreground hover:border-navy">Отмена</button>
            </div>
          </div>
        )}

        {/* Детали выбранного юр. лица + его брони */}
        {selected && !editing && (
          <div className="mt-6">
            <button onClick={() => setSelected(null)} className="text-[11px] uppercase tracking-widest text-navy hover:text-[#C9A96E]">← Все юр. лица</button>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-navy">{selected.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {selected.inn ? `ИНН ${selected.inn}` : ""}{selected.kpp ? ` · КПП ${selected.kpp}` : ""}{selected.ogrn ? ` · ОГРН ${selected.ogrn}` : ""}
                </p>
                {selected.legal_address && <p className="text-xs text-muted-foreground">{selected.legal_address}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(selected)} className="border border-navy px-4 py-2 text-[10px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream">Изменить</button>
                <button onClick={() => void removeCompany(selected.id)} className="border border-rose-300 px-4 py-2 text-[10px] uppercase tracking-widest text-rose-600 hover:bg-rose-50">Удалить</button>
              </div>
            </div>

            <h3 className="mt-6 font-serif text-lg text-navy">Брони этого юр. лица</h3>
            {bookings.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Пока нет привязанных броней. Привязать можно в карточке брони (поле «Юр. лицо»).</p>
            ) : (
              <div className="mt-3 overflow-hidden border border-border">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-border">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-cream/20">
                        <td className="px-4 py-3 font-mono text-xs text-navy">{b.booking_number ?? "—"}</td>
                        <td className="px-4 py-3"><div className="text-navy">{`${b.last_name ?? ""} ${b.first_name ?? ""}`.trim() || "Гость"}</div><div className="text-xs text-muted-foreground">{b.room_name}</div></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(b.check_in)} — {fmtDate(b.check_out)}</td>
                        <td className="px-4 py-3 text-navy">{fmtRub(b.total_price ?? 0)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link to="/admin/document/$id" params={{ id: b.id }} search={{ type: "invoice" }} className="border border-navy px-3 py-1.5 text-[10px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream whitespace-nowrap">Счёт</Link>
                            <Link to="/admin/document/$id" params={{ id: b.id }} search={{ type: "upd" }} className="border border-navy px-3 py-1.5 text-[10px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream whitespace-nowrap">УПД</Link>
                            <Link to="/admin/document/$id" params={{ id: b.id }} search={{ type: "sf" }} className="border border-navy px-3 py-1.5 text-[10px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream whitespace-nowrap">Сч-Ф</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Список юр. лиц */}
        {!selected && !editing && (
          <div className="mt-6">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Поиск по названию или ИНН" className="mb-4 w-72 border border-border bg-background px-3 py-2 text-sm text-navy outline-none focus:border-navy" />
            {loading ? (
              <p className="text-sm text-muted-foreground">Загрузка…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Юр. лиц пока нет. Нажмите «+ Добавить юр. лицо».</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((c) => (
                  <button key={c.id} onClick={() => setSelected(c)} className="border border-border bg-background p-4 text-left hover:border-navy">
                    <div className="font-serif text-lg text-navy">{c.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{c.inn ? `ИНН ${c.inn}` : "ИНН не указан"}{c.kpp ? ` · КПП ${c.kpp}` : ""}</div>
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

function Field({ label, value, onChange, wide }: { label: string; value: string; onChange: (v: string) => void; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm text-navy outline-none focus:border-navy" />
    </label>
  );
}
