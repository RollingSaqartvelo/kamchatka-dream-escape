import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { sourceLabel } from "@/lib/channels";

export const Route = createFileRoute("/admin/guests")({ component: GuestsPage });

export type GBk = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  total_price: number;
  nights: number;
  check_in: string;
  check_out: string;
  room_name: string;
  payment_status: string;
  source: string | null;
  created_at: string;
};

export type Guest = {
  key: string;
  name: string;
  email: string;
  phone: string;
  bookings: GBk[];
  stays: number; // non-cancelled
  ltv: number; // sum non-cancelled total_price
  nights: number;
  lastStay: string;
  firstSeen: string;
  sources: string[];
  tags: string[];
};

const fmtRub = (n: number) => "₽ " + new Intl.NumberFormat("ru-RU").format(Math.round(n));
const PLACEHOLDER_EMAILS = new Set(["tl@noemail.invalid", ""]);

const normEmail = (e: string) => (e ?? "").trim().toLowerCase();
// Canonicalize RU numbers to the last 10 digits so +7… and 8… match.
function normPhone(p: string): string {
  let d = (p ?? "").replace(/\D/g, "");
  if (d.length === 11 && (d[0] === "7" || d[0] === "8")) d = d.slice(1);
  return d;
}

/** Identity key: prefer a real email, else a usable phone, else unique-by-id
 *  (so TravelLine's placeholder email doesn't merge unrelated guests). */
function guestKey(b: GBk): string {
  const email = normEmail(b.email);
  if (email && !PLACEHOLDER_EMAILS.has(email)) return `e:${email}`;
  const phone = normPhone(b.phone);
  if (phone.length >= 7) return `p:${phone}`;
  return `id:${b.id}`;
}

export function aggregateGuests(rows: GBk[]): Guest[] {
  const map = new Map<string, GBk[]>();
  for (const b of rows) {
    const k = guestKey(b);
    const arr = map.get(k);
    if (arr) arr.push(b);
    else map.set(k, [b]);
  }

  const guests: Guest[] = [];
  for (const [key, bks] of map) {
    const sorted = [...bks].sort((a, b) => (a.check_in < b.check_in ? 1 : -1)); // newest first
    const active = sorted.filter((b) => b.payment_status !== "cancelled");
    const latest = sorted[0];
    const ltv = active.reduce((s, b) => s + (b.total_price || 0), 0);
    const nights = active.reduce((s, b) => s + (b.nights || 0), 0);
    const sources = [...new Set(sorted.map((b) => sourceLabel(b.source ?? "manual")))];
    const tags: string[] = [];
    if (active.length >= 2) tags.push("Постоянный");
    if (ltv >= 100000 || active.length >= 3) tags.push("VIP");
    guests.push({
      key,
      name: `${latest.last_name} ${latest.first_name}`.trim() || "Гость",
      email: latest.email,
      phone: latest.phone,
      bookings: sorted,
      stays: active.length,
      ltv,
      nights,
      lastStay: latest.check_in,
      firstSeen: sorted[sorted.length - 1].check_in,
      sources,
      tags,
    });
  }
  return guests.sort((a, b) => b.ltv - a.ltv);
}

function GuestsPage() {
  const [rows, setRows] = useState<GBk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("id, first_name, last_name, email, phone, total_price, nights, check_in, check_out, room_name, payment_status, source, created_at")
        .order("check_in", { ascending: false })
        .limit(2000);
      if (!active) return;
      if (error) console.error(error);
      setRows((data as GBk[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const guests = useMemo(() => aggregateGuests(rows), [rows]);
  return <GuestsView guests={guests} loading={loading} />;
}

export function GuestsView({ guests, loading }: { guests: Guest[]; loading: boolean }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Guest | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return guests;
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(s) ||
        g.email.toLowerCase().includes(s) ||
        g.phone.replace(/\D/g, "").includes(s.replace(/\D/g, "")),
    );
  }, [guests, q]);

  const returning = guests.filter((g) => g.stays >= 2).length;
  const totalLtv = guests.reduce((s, g) => s + g.ltv, 0);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">CRM</p>
        <h1 className="mt-2 font-serif text-4xl text-navy">Гости</h1>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi icon="👥" label="Гостей" value={String(guests.length)} />
          <Kpi icon="🔁" label="Повторных" value={`${returning} · ${guests.length ? Math.round((returning / guests.length) * 100) : 0}%`} />
          <Kpi icon="💰" label="Сумма LTV" value={fmtRub(totalLtv)} />
          <Kpi icon="⭐" label="VIP" value={String(guests.filter((g) => g.tags.includes("VIP")).length)} />
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по имени, email, телефону…"
          className="mt-6 w-full max-w-md border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[#C9A96E]"
        />

        <div className="mt-4 overflow-x-auto border border-border bg-background">
          <table className="min-w-full text-sm">
            <thead className="bg-cream/50 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Гость</th>
                <th className="px-4 py-3">Контакты</th>
                <th className="px-4 py-3 text-center">Визитов</th>
                <th className="px-4 py-3 text-center">Ночей</th>
                <th className="px-4 py-3 text-right">LTV</th>
                <th className="px-4 py-3">Последний</th>
                <th className="px-4 py-3">Теги</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Загрузка…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Гостей не найдено</td></tr>
              )}
              {filtered.map((g) => (
                <tr
                  key={g.key}
                  onClick={() => setSel(g)}
                  className="cursor-pointer border-t border-border hover:bg-cream/40"
                >
                  <td className="px-4 py-3 font-medium text-navy">{g.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <div>{g.phone || "—"}</div>
                    <div className="truncate">{g.email && !g.email.includes("noemail") ? g.email : ""}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-navy">{g.stays}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{g.nights}</td>
                  <td className="px-4 py-3 text-right font-serif text-navy">{fmtRub(g.ltv)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {g.lastStay ? format(parseISO(g.lastStay), "d MMM yyyy", { locale: ru }) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {g.tags.map((t) => (
                        <span key={t} className={`px-2 py-0.5 text-[10px] uppercase tracking-wide ${t === "VIP" ? "bg-[#C9A96E] text-white" : "bg-navy/10 text-navy"}`}>{t}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      {sel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setSel(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-background p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-serif text-2xl text-navy">{sel.name}</h2>
                <div className="mt-1 flex flex-wrap gap-1">
                  {sel.tags.map((t) => (
                    <span key={t} className={`px-2 py-0.5 text-[10px] uppercase tracking-wide ${t === "VIP" ? "bg-[#C9A96E] text-white" : "bg-navy/10 text-navy"}`}>{t}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => setSel(null)} className="text-2xl text-muted-foreground">×</button>
            </div>

            <div className="mt-4 space-y-1 text-sm">
              {sel.phone && <p className="text-navy">📞 {sel.phone}</p>}
              {sel.email && !sel.email.includes("noemail") && <p className="text-navy">✉️ {sel.email}</p>}
              <p className="text-muted-foreground">Источники: {sel.sources.join(", ")}</p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="border border-border py-3">
                <p className="font-serif text-xl text-navy">{sel.stays}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">визитов</p>
              </div>
              <div className="border border-border py-3">
                <p className="font-serif text-xl text-navy">{sel.nights}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">ночей</p>
              </div>
              <div className="border border-border py-3">
                <p className="font-serif text-xl text-navy">{fmtRub(sel.ltv)}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">LTV</p>
              </div>
            </div>

            <p className="mt-6 text-[11px] uppercase tracking-widest text-muted-foreground">История ({sel.bookings.length})</p>
            <div className="mt-3 space-y-2">
              {sel.bookings.map((b) => (
                <div key={b.id} className={`border border-border p-3 text-sm ${b.payment_status === "cancelled" ? "opacity-50" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-navy">
                      {format(parseISO(b.check_in), "d MMM", { locale: ru })} — {format(parseISO(b.check_out), "d MMM yyyy", { locale: ru })}
                    </span>
                    <span className="font-serif text-navy">{fmtRub(b.total_price)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">{b.room_name}</span>
                    <span>{sourceLabel(b.source ?? "manual")} · {b.payment_status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-cream/30 px-4 py-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{icon} {label}</p>
      <p className="mt-1 font-serif text-2xl text-navy">{value}</p>
    </div>
  );
}
