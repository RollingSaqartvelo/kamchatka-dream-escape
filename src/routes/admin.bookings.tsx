import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/admin/bookings")({
  component: AdminBookingsPage,
  head: () => ({
    meta: [
      { title: "Бронирования — Админка «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});


type Booking = {
  id: string;
  booking_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  room_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  meal_plan: string;
  total_price: number;
  payment_status: string;
  payment_method: string | null;
  special_requests: string[] | null;
  custom_request: string | null;
  admin_notes: string | null;
  messenger_type: string | null;
  messenger_username: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
};

const STATUSES = [
  { value: "pending", label: "Новая", color: "bg-amber-100 text-amber-900" },
  { value: "confirmed", label: "Подтверждена", color: "bg-blue-100 text-blue-900" },
  { value: "paid", label: "Оплачена", color: "bg-emerald-100 text-emerald-900" },
  { value: "cancelled", label: "Отменена", color: "bg-rose-100 text-rose-900" },
  { value: "completed", label: "Завершена", color: "bg-zinc-200 text-zinc-700" },
];

function fmtRub(n: number) {
  return "₽ " + new Intl.NumberFormat("ru-RU").format(n);
}

function statusMeta(s: string) {
  return STATUSES.find((x) => x.value === s) ?? STATUSES[0];
}

function AdminBookingsPage() {
  const navigate = useNavigate();
  const { user, isStaff, loading: authLoading, signOut } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user || !isStaff) return;
    loadBookings();
  }, [user, isStaff]);

  async function loadBookings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setBookings((data as Booking[]) ?? []);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, payment_status: string) {
    const prev = bookings;
    setBookings(bookings.map((b) => (b.id === id ? { ...b, payment_status } : b)));
    if (selected?.id === id) setSelected({ ...selected, payment_status });
    const { error } = await supabase
      .from("bookings")
      .update({ payment_status })
      .eq("id", id);
    if (error) {
      console.error(error);
      setBookings(prev);
    }
  }

  async function saveNotes(id: string, admin_notes: string) {
    const { error } = await supabase
      .from("bookings")
      .update({ admin_notes })
      .eq("id", id);
    if (error) console.error(error);
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, admin_notes } : b)));
  }

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (filter !== "all" && b.payment_status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.booking_number.toLowerCase().includes(q) ||
          b.first_name.toLowerCase().includes(q) ||
          b.last_name.toLowerCase().includes(q) ||
          b.email.toLowerCase().includes(q) ||
          b.phone.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, filter, search]);

  function exportCsv() {
    const headers = [
      "Номер",
      "Создано",
      "Гость",
      "Email",
      "Телефон",
      "Номер отеля",
      "Заезд",
      "Выезд",
      "Ночей",
      "Взр.",
      "Дети",
      "Сумма",
      "Статус",
    ];
    const rows = filtered.map((b) => [
      b.booking_number,
      format(parseISO(b.created_at), "dd.MM.yyyy HH:mm"),
      `${b.last_name} ${b.first_name}`,
      b.email,
      b.phone,
      b.room_name,
      b.check_in,
      b.check_out,
      b.nights,
      b.adults,
      b.children,
      b.total_price,
      statusMeta(b.payment_status).label,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Загрузка…</div>;
  }

  if (!user) return null;

  if (!isStaff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f5f2ee] px-4 text-center">
        <h1 className="font-serif text-3xl text-navy">Доступ запрещён</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          У вашей учётной записи ({user.email}) нет роли администратора или менеджера.
          Обратитесь к владельцу отеля.
        </p>
        <button
          onClick={() => signOut().then(() => navigate({ to: "/login" }))}
          className="border border-navy px-6 py-3 text-[11px] uppercase tracking-widest text-navy hover:bg-navy hover:text-white"
        >
          Выйти
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f2ee]">
      {/* Top bar */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-serif text-xl text-navy">
              Полуостров
            </Link>
            <span className="text-[10px] uppercase tracking-[3px] text-muted-foreground">
              Админ-панель
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{user.email}</span>
            <button
              onClick={() => signOut().then(() => navigate({ to: "/login" }))}
              className="text-[10px] uppercase tracking-widest text-navy hover:text-[#C9A96E]"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">
              Заявки гостей
            </p>
            <h1 className="mt-2 font-serif text-4xl text-navy">Бронирования</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Всего: {bookings.length} · Показано: {filtered.length}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="Поиск: номер, имя, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A96E]"
            />
            <button
              onClick={exportCsv}
              className="border border-navy px-5 py-2 text-[11px] uppercase tracking-widest text-navy hover:bg-navy hover:text-white"
            >
              Экспорт CSV
            </button>
            <button
              onClick={loadBookings}
              className="border border-border px-5 py-2 text-[11px] uppercase tracking-widest text-muted-foreground hover:border-navy hover:text-navy"
            >
              Обновить
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[{ value: "all", label: `Все (${bookings.length})` }, ...STATUSES.map((s) => ({
            value: s.value,
            label: `${s.label} (${bookings.filter((b) => b.payment_status === s.value).length})`,
          }))].map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`border px-4 py-2 text-[10px] uppercase tracking-widest transition-colors ${
                filter === s.value
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-background text-muted-foreground hover:border-navy"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="mt-6 overflow-x-auto border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-cream/40 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Номер</th>
                <th className="px-4 py-3">Гость</th>
                <th className="px-4 py-3">Даты</th>
                <th className="px-4 py-3">Номер отеля</th>
                <th className="px-4 py-3">Гости</th>
                <th className="px-4 py-3 text-right">Сумма</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    Загрузка…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    Нет заявок
                  </td>
                </tr>
              )}
              {filtered.map((b) => {
                const sm = statusMeta(b.payment_status);
                return (
                  <tr
                    key={b.id}
                    className="border-b border-border last:border-b-0 hover:bg-cream/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-navy">
                      {b.booking_number}
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {format(parseISO(b.created_at), "d MMM, HH:mm", { locale: ru })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-navy">
                        {b.last_name} {b.first_name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{b.email}</div>
                      <div className="text-[11px] text-muted-foreground">{b.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-navy">
                      {format(parseISO(b.check_in), "d MMM", { locale: ru })} —{" "}
                      {format(parseISO(b.check_out), "d MMM yyyy", { locale: ru })}
                      <div className="text-[11px] text-muted-foreground">
                        {b.nights} ноч.
                      </div>
                    </td>
                    <td className="px-4 py-3 text-navy">
                      {b.room_name}
                      <div className="text-[11px] text-muted-foreground">
                        {b.meal_plan === "breakfast" ? "С завтраком" : "Без завтрака"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-navy">
                      {b.adults} взр.
                      {b.children > 0 && ` + ${b.children} дет.`}
                    </td>
                    <td className="px-4 py-3 text-right font-serif text-base text-navy">
                      {fmtRub(b.total_price)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={b.payment_status}
                        onChange={(e) => updateStatus(b.id, e.target.value)}
                        className={`border border-border px-2 py-1 text-[11px] ${sm.color}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(b)}
                        className="text-[10px] uppercase tracking-widest text-[#C9A96E] hover:underline"
                      >
                        Открыть
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            className="h-full w-full max-w-lg overflow-y-auto bg-background p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[3px] text-[#C9A96E]">
                  Бронирование
                </p>
                <p className="mt-1 font-mono text-lg text-navy">{selected.booking_number}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-2xl text-muted-foreground hover:text-navy"
              >
                ×
              </button>
            </div>

            <div className="mt-8 space-y-6 text-sm">
              <Section title="Гость">
                <Row label="Имя">{selected.last_name} {selected.first_name}</Row>
                <Row label="Email">{selected.email}</Row>
                <Row label="Телефон">{selected.phone}</Row>
                {selected.city && <Row label="Город">{selected.city}</Row>}
                {selected.country && <Row label="Страна">{selected.country}</Row>}
                {selected.messenger_type && selected.messenger_type !== "none" && (
                  <Row label="Мессенджер">
                    {selected.messenger_type}: {selected.messenger_username}
                  </Row>
                )}
              </Section>

              <Section title="Проживание">
                <Row label="Номер">{selected.room_name}</Row>
                <Row label="Заезд">{format(parseISO(selected.check_in), "d MMMM yyyy", { locale: ru })}</Row>
                <Row label="Выезд">{format(parseISO(selected.check_out), "d MMMM yyyy", { locale: ru })}</Row>
                <Row label="Ночей">{selected.nights}</Row>
                <Row label="Гости">
                  {selected.adults} взр.
                  {selected.children > 0 && ` + ${selected.children} дет.`}
                </Row>
                <Row label="Питание">
                  {selected.meal_plan === "breakfast" ? "С завтраком" : "Без завтрака"}
                </Row>
                <Row label="Итого">
                  <span className="font-serif text-lg">{fmtRub(selected.total_price)}</span>
                </Row>
              </Section>

              {selected.special_requests && selected.special_requests.length > 0 && (
                <Section title="Пожелания">
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {selected.special_requests.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </Section>
              )}

              {selected.custom_request && (
                <Section title="Комментарий гостя">
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {selected.custom_request}
                  </p>
                </Section>
              )}

              <Section title="Внутренние заметки">
                <textarea
                  defaultValue={selected.admin_notes ?? ""}
                  rows={4}
                  className="w-full border border-border bg-background p-3 text-sm outline-none focus:border-[#C9A96E]"
                  onBlur={(e) => saveNotes(selected.id, e.target.value)}
                  placeholder="Заметки для команды (сохраняется автоматически)"
                />
              </Section>

              <Section title="Статус оплаты">
                <select
                  value={selected.payment_status}
                  onChange={(e) => updateStatus(selected.id, e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[10px] uppercase tracking-[3px] text-[#C9A96E]">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-navy">{children}</span>
    </div>
  );
}
