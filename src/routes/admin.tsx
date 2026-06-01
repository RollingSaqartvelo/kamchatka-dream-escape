import { useEffect, useCallback, useRef } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({
    meta: [
      { title: "Админка — Полуостров" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const NAV = [
  { to: "/admin", label: "Дашборд", icon: "📊" },
  { to: "/admin/analytics", label: "Аналитика", icon: "📈" },
  { to: "/admin/bookings", label: "Бронирования", icon: "📋" },
  { to: "/admin/guests", label: "Гости", icon: "👤" },
  { to: "/admin/calendar", label: "Календарь", icon: "📅" },
  { to: "/admin/inbox", label: "Инбокс", icon: "💬" },
  { to: "/admin/rooms", label: "Номера", icon: "🛏️" },
  { to: "/admin/notifications", label: "Уведомления", icon: "🔔" },
] as const;

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 минут

function AdminLayout() {
  const navigate = useNavigate();
  const { user, isStaff, loading, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSignOut = useCallback(() => {
    signOut().then(() => navigate({ to: "/login" }));
  }, [signOut, navigate]);

  // Автовыход через 15 минут бездействия
  useEffect(() => {
    if (!user) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleSignOut, IDLE_TIMEOUT_MS);
    };

    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset(); // запускаем таймер сразу

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user, handleSignOut]);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Загрузка…
      </div>
    );
  }
  if (!user) return null;

  if (!isStaff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-4 text-center">
        <h1 className="font-serif text-3xl text-navy">Доступ запрещён</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          У вашей учётной записи ({user.email}) нет роли администратора или менеджера.
        </p>
        <button
          onClick={() => signOut().then(() => navigate({ to: "/login" }))}
          className="border border-navy px-6 py-3 text-[11px] uppercase tracking-widest text-navy hover:bg-navy hover:text-cream"
        >
          Выйти
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background md:flex">
        <div className="border-b border-border px-6 py-6">
          <Link to="/" className="font-serif text-xl text-navy">
            Полуостров
          </Link>
          <p className="mt-1 text-[10px] uppercase tracking-[3px] text-[#C9A96E]">
            Админ-панель
          </p>
        </div>

        <nav className="flex-1 px-3 py-4">
          {NAV.map((n) => {
            const active =
              n.to === "/admin"
                ? pathname === "/admin" || pathname === "/admin/"
                : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  active
                    ? "bg-navy text-cream"
                    : "text-navy hover:bg-cream"
                }`}
              >
                <span className="text-base">{n.icon}</span>
                <span className="uppercase tracking-widest text-[11px]">{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border px-6 py-4">
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <button
            onClick={() => signOut().then(() => navigate({ to: "/login" }))}
            className="mt-2 text-[10px] uppercase tracking-widest text-navy hover:text-[#C9A96E]"
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <Link to="/" className="font-serif text-lg text-navy">
          Полуостров
        </Link>
        <select
          value={
            NAV.find((n) =>
              n.to === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(n.to),
            )?.to ?? "/admin"
          }
          onChange={(e) => navigate({ to: e.target.value as any })}
          className="border border-border bg-background px-2 py-1 text-xs"
        >
          {NAV.map((n) => (
            <option key={n.to} value={n.to}>
              {n.label}
            </option>
          ))}
        </select>
      </div>

      <main className="flex-1 overflow-x-hidden pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
