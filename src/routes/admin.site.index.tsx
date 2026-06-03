import { createFileRoute, Link } from "@tanstack/react-router";
import { SITE_SECTIONS } from "./admin.site";

export const Route = createFileRoute("/admin/site/")({
  component: AdminSiteIndex,
});

function AdminSiteIndex() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">Выберите раздел для редактирования:</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SITE_SECTIONS.map((s) => {
          const ready = s.status === "ready";
          const card = (
            <div
              className={`flex h-full flex-col justify-between border p-6 ${
                ready ? "border-border bg-background hover:border-navy" : "border-dashed border-border bg-cream/20"
              }`}
            >
              <h3 className="font-serif text-xl text-navy">{s.label}</h3>
              <p className={`mt-3 text-[11px] uppercase tracking-widest ${ready ? "text-[#C9A96E]" : "text-muted-foreground/60"}`}>
                {ready ? "Редактировать →" : "В разработке"}
              </p>
            </div>
          );
          return ready ? (
            <Link key={s.to} to={s.to}>
              {card}
            </Link>
          ) : (
            <div key={s.to} className="cursor-not-allowed">
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
