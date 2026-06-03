import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/admin/site")({
  component: AdminSiteLayout,
  head: () => ({
    meta: [
      { title: "Управление отелем — Админка «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

// Разделы конструктора. status: "ready" — рабочая подстраница, "soon" — в разработке.
export const SITE_SECTIONS: { to: string; label: string; status: "ready" | "soon" }[] = [
  { to: "/admin/site/home", label: "Главная", status: "ready" },
  { to: "/admin/site/services", label: "Услуги", status: "ready" },
  { to: "/admin/site/about", label: "Об отеле / Условия", status: "soon" },
  { to: "/admin/site/wellness", label: "Оздоровление", status: "soon" },
  { to: "/admin/site/kamchatka", label: "О Камчатке", status: "soon" },
  { to: "/admin/site/contacts", label: "Контакты", status: "soon" },
  { to: "/admin/site/nav", label: "Меню и подвал", status: "soon" },
];

function AdminSiteLayout() {
  const { isAdmin, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-serif text-3xl text-navy">Только для администратора</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Редактировать контент сайта может только владелец (роль admin). Менеджеры — без доступа.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">Конструктор контента</p>
        <h1 className="mt-2 font-serif text-4xl text-navy">Управление отелем</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Меняйте тексты и фотографии на страницах сайта. Дизайн менять нельзя — только
          содержимое. Изменения появляются на сайте сразу после сохранения.
        </p>

        {/* Под-навигация раздела */}
        <nav className="mt-6 flex flex-wrap gap-2">
          {SITE_SECTIONS.map((s) => {
            const active = pathname.startsWith(s.to);
            if (s.status === "soon") {
              return (
                <span
                  key={s.to}
                  className="cursor-not-allowed border border-dashed border-border px-4 py-2 text-[11px] uppercase tracking-widest text-muted-foreground/60"
                  title="В разработке"
                >
                  {s.label} · скоро
                </span>
              );
            }
            return (
              <Link
                key={s.to}
                to={s.to}
                className={`border px-4 py-2 text-[11px] uppercase tracking-widest transition-colors ${
                  active ? "border-navy bg-navy text-cream" : "border-border text-navy hover:bg-cream"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
