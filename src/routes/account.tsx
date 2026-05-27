import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PageHero } from "@/components/sections/PageHero";
import { BookingsCalendar } from "@/components/admin/BookingsCalendar";

import { useAuth } from "@/lib/useAuth";
import { getMyProfile, upsertMyProfile, getMyBookings } from "@/lib/profile.functions";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({
    meta: [{ title: "Личный кабинет — Полуостров" }, { name: "robots", content: "noindex" }],
  }),
});

function AccountPage() {
  const { user, loading: authLoading, isStaff, signOut } = useAuth();

  if (authLoading) {
    return (
      <SiteLayout>
        <PageHero eyebrow="Account" title="Личный кабинет" videoSrc="/media/account.mp4" />
        <section className="bg-background py-16">
          <p className="text-center text-muted-foreground">Загружаем…</p>
        </section>
      </SiteLayout>
    );
  }

  if (!user) {
    return (
      <SiteLayout>
        <PageHero eyebrow="Account" title="Личный кабинет" videoSrc="/media/account.mp4" />
        <section className="bg-background py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <NotLoggedIn />
          </div>
        </section>
      </SiteLayout>
    );
  }

  if (isStaff) {
    return (
      <SiteLayout>
        <PageHero eyebrow="Staff" title="Кабинет администратора" videoSrc="/media/account.mp4" />
        <section className="bg-background py-12">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">
                  Заполняемость
                </p>
                <h2 className="mt-1 font-serif text-3xl text-navy">Календарь броней</h2>
                <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/admin/bookings"
                  className="border border-navy px-4 py-2 text-[10px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream"
                >
                  Список броней
                </Link>
                <Link
                  to="/admin/rooms"
                  className="border border-navy px-4 py-2 text-[10px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream"
                >
                  Номера
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                  }}
                  className="border border-border px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:border-navy hover:text-navy"
                >
                  Выйти
                </button>
              </div>
            </div>
            <BookingsCalendar />
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHero eyebrow="Account" title="Личный кабинет" videoSrc="/media/account.mp4" />
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <LoggedIn email={user.email ?? ""} onSignOut={signOut} />
        </div>
      </section>
    </SiteLayout>
  );
}

function NotLoggedIn() {
  return (
    <div className="mx-auto max-w-md border border-beige bg-cream p-10 text-center">
      <h2 className="font-serif text-3xl text-navy">Войти в кабинет</h2>
      <p className="mt-4 text-sm text-muted-foreground">
        Сохраняйте данные брони и заполняйте форму бронирования в один клик.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          to="/login"
          className="bg-navy py-4 text-[11px] uppercase tracking-[2px] text-cream hover:bg-gold"
        >
          Войти
        </Link>
        <Link
          to="/signup"
          className="border border-navy py-4 text-[11px] uppercase tracking-[2px] text-navy hover:bg-navy hover:text-cream"
        >
          Зарегистрироваться
        </Link>
      </div>
    </div>
  );
}

type Profile = {
  salutation: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  messenger_type: string | null;
  messenger_username: string | null;
};

type Booking = {
  id: string;
  booking_number: string;
  room_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  total_price: number;
  prepayment_amount: number;
  payment_status: string;
  created_at: string;
};

function createEmptyProfile(email: string): Profile {
  return {
    salutation: null,
    first_name: "",
    last_name: "",
    phone: "",
    email,
    city: "",
    country: "",
    messenger_type: "none",
    messenger_username: "",
  };
}

function LoggedIn({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(upsertMyProfile);
  const fetchBookings = useServerFn(getMyBookings);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchProfile(), fetchBookings()])
      .then(([p, b]) => {
        setProfile((p as Profile) ?? createEmptyProfile(email));
        setBookings(b as Booking[]);
      })
      .catch((e) => {
        console.error(e);
        setProfile(createEmptyProfile(email));
        setBookings([]);
        toast.error("Не удалось загрузить данные");
      })
      .finally(() => setLoading(false));
  }, [fetchProfile, fetchBookings, email]);

  async function onSave() {
    if (!profile) return;
    setSaving(true);
    try {
      await saveProfile({
        data: {
          salutation: (profile.salutation as "mr" | "mrs" | null) ?? null,
          first_name: profile.first_name ?? "",
          last_name: profile.last_name ?? "",
          phone: profile.phone ?? "",
          email: profile.email ?? email,
          city: profile.city ?? "",
          country: profile.country ?? "",
          messenger_type:
            (profile.messenger_type as "telegram" | "vk_max" | "none" | null) ?? "none",
          messenger_username: profile.messenger_username ?? "",
        },
      });
      toast.success("Данные сохранены");
    } catch (e) {
      console.error(e);
      toast.error("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await onSignOut();
    navigate({ to: "/" });
  }

  if (loading || !profile) {
    return <p className="text-center text-muted-foreground">Загружаем данные…</p>;
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
      {/* Profile */}
      <div className="border border-beige bg-cream p-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl text-navy">Мои данные</h2>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-[10px] uppercase tracking-[2px] text-muted-foreground hover:text-navy"
          >
            Выйти
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{email}</p>

        <div className="mt-8 space-y-4">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-navy">Обращение</span>
            <div className="mt-2 flex gap-6">
              {(["mr", "mrs"] as const).map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 text-sm text-navy">
                  <input
                    type="radio"
                    name="salutation"
                    className="h-4 w-4 accent-gold"
                    checked={profile.salutation === s}
                    onChange={() => setProfile({ ...profile, salutation: s })}
                  />
                  {s === "mr" ? "Господин" : "Госпожа"}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Имя"
              value={profile.first_name ?? ""}
              onChange={(v) => setProfile({ ...profile, first_name: v })}
            />
            <Field
              label="Фамилия"
              value={profile.last_name ?? ""}
              onChange={(v) => setProfile({ ...profile, last_name: v })}
            />
            <Field
              label="Телефон"
              value={profile.phone ?? ""}
              onChange={(v) => setProfile({ ...profile, phone: v })}
            />
            <Field
              label="Email"
              value={profile.email ?? ""}
              type="email"
              onChange={(v) => setProfile({ ...profile, email: v })}
            />
            <Field
              label="Город"
              value={profile.city ?? ""}
              onChange={(v) => setProfile({ ...profile, city: v })}
            />
            <Field
              label="Страна"
              value={profile.country ?? ""}
              onChange={(v) => setProfile({ ...profile, country: v })}
            />
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-widest text-navy">
              Мессенджер для напоминаний
            </span>
            <div className="mt-2 flex flex-wrap gap-4">
              {(
                [
                  { v: "telegram", label: "Telegram" },
                  { v: "vk_max", label: "ВК / Макс" },
                  { v: "none", label: "Не нужно" },
                ] as const
              ).map((m) => (
                <label
                  key={m.v}
                  className="flex cursor-pointer items-center gap-2 text-sm text-navy"
                >
                  <input
                    type="radio"
                    name="messenger"
                    className="h-4 w-4 accent-gold"
                    checked={profile.messenger_type === m.v}
                    onChange={() => setProfile({ ...profile, messenger_type: m.v })}
                  />
                  {m.label}
                </label>
              ))}
            </div>
            {profile.messenger_type && profile.messenger_type !== "none" && (
              <input
                value={profile.messenger_username ?? ""}
                onChange={(e) => setProfile({ ...profile, messenger_username: e.target.value })}
                placeholder="@username или номер"
                className="mt-3 w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
              />
            )}
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="w-full bg-navy py-4 text-[11px] uppercase tracking-[2px] text-cream transition-colors hover:bg-gold disabled:opacity-50"
          >
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </div>

      {/* Bookings */}
      <div>
        <h2 className="font-serif text-2xl text-navy">Мои брони</h2>
        {bookings.length === 0 ? (
          <div className="mt-6 border border-dashed border-beige bg-cream p-10 text-center">
            <p className="text-muted-foreground">У вас пока нет броней.</p>
            <Link
              to="/booking"
              className="mt-6 inline-block bg-navy px-8 py-3 text-[11px] uppercase tracking-[2px] text-cream hover:bg-gold"
            >
              Забронировать
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {bookings.map((b) => (
              <li key={b.id} className="border border-beige bg-cream p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-serif text-xl text-navy">{b.room_name}</p>
                  <span className="text-[10px] uppercase tracking-[2px] text-muted-foreground">
                    № {b.booking_number}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {fmtDate(b.check_in)} → {fmtDate(b.check_out)} · {b.nights} ноч. ·{" "}
                  {b.adults + b.children} гост.
                </p>
                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
                  <span className="font-serif text-lg text-navy">
                    ₽ {new Intl.NumberFormat("ru-RU").format(b.total_price)}
                  </span>
                  <StatusBadge status={b.payment_status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full border border-border bg-background px-3 py-3 text-sm text-navy outline-none focus:border-gold"
      />
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Ожидает оплаты", cls: "bg-beige text-navy" },
    paid: { label: "Оплачено", cls: "bg-green-100 text-green-800" },
    failed: { label: "Ошибка оплаты", cls: "bg-red-100 text-red-800" },
    cancelled: { label: "Отменена", cls: "bg-gray-100 text-gray-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-beige text-navy" };
  return (
    <span className={`px-3 py-1 text-[10px] uppercase tracking-[2px] ${s.cls}`}>{s.label}</span>
  );
}

function fmtDate(iso: string) {
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: ru });
  } catch {
    return iso;
  }
}
