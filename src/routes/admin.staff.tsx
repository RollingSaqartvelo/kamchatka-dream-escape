import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { listStaff, addStaff, removeStaff } from "@/lib/staff.functions";

export const Route = createFileRoute("/admin/staff")({
  component: StaffPage,
  head: () => ({
    meta: [
      { title: "Сотрудники — Админка «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type StaffRow = { userId: string; email: string; role: "admin" | "manager" };

function StaffPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const list = useServerFn(listStaff);
  const add = useServerFn(addStaff);
  const remove = useServerFn(removeStaff);

  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  function reload() {
    setLoading(true);
    list()
      .then((r) => setRows(r as StaffRow[]))
      .catch(() => toast.error("Не удалось загрузить список"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!authLoading && isAdmin) reload();
    else if (!authLoading) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await add({ data: { email: email.trim(), role: "manager" } });
      toast.success("Администратор добавлен. Вход — по ссылке на его почту.");
      setEmail("");
      reload();
    } catch (err: any) {
      toast.error(err?.message ?? "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(row: StaffRow) {
    if (!confirm(`Снять доступ у ${row.email}?`)) return;
    try {
      await remove({ data: { userId: row.userId } });
      toast.success("Доступ снят");
      reload();
    } catch (err: any) {
      toast.error(err?.message ?? "Ошибка");
    }
  }

  if (authLoading) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-serif text-3xl text-navy">Только для Шефа</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Управлять сотрудниками может только владелец (роль admin).
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">Доступ</p>
        <h1 className="mt-2 font-serif text-4xl text-navy">Сотрудники</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          «Шеф» видит всё, включая «Управление отелем». «Администратор» — календарь, брони,
          статусы, гости и инбокс, но <b>не может менять сайт</b>. Вход у всех — по ссылке на почту
          (пароль не нужен).
        </p>

        {/* Добавить администратора */}
        <form onSubmit={onAdd} className="mt-8 flex flex-wrap items-end gap-3 border border-border bg-cream/30 p-5">
          <label className="flex-1">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Email нового администратора
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.ru"
              className="mt-1 w-full border border-border bg-background px-3 py-2.5 text-sm text-navy outline-none focus:border-navy"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="bg-navy px-6 py-2.5 text-[11px] uppercase tracking-widest text-cream hover:bg-[#C9A96E] disabled:opacity-40"
          >
            {busy ? "Добавляем…" : "Добавить администратора"}
          </button>
        </form>

        {/* Список */}
        <div className="mt-8">
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет сотрудников.</p>
          ) : (
            <ul className="divide-y divide-border border border-border">
              {rows.map((r) => (
                <li key={r.userId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm text-navy">{r.email}</p>
                    <span
                      className={`text-[10px] uppercase tracking-widest ${
                        r.role === "admin" ? "text-[#C9A96E]" : "text-muted-foreground"
                      }`}
                    >
                      {r.role === "admin" ? "Шеф (полный доступ)" : "Администратор"}
                    </span>
                  </div>
                  {r.role === "admin" ? (
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">владелец</span>
                  ) : (
                    <button
                      onClick={() => void onRemove(r)}
                      className="border border-rose-300 px-3 py-1.5 text-[10px] uppercase tracking-widest text-rose-600 hover:bg-rose-50"
                    >
                      Снять доступ
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
