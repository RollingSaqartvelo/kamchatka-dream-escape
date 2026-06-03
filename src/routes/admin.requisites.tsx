import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/useAuth";
import { PageEditor } from "@/components/admin/PageEditor";
import { REQUISITES_SCHEMA } from "@/lib/requisites";

export const Route = createFileRoute("/admin/requisites")({
  component: RequisitesPage,
  head: () => ({
    meta: [
      { title: "Реквизиты — Админка «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function RequisitesPage() {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-serif text-3xl text-navy">Только для Шефа</h1>
        <p className="mt-4 text-sm text-muted-foreground">Менять реквизиты может только владелец.</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">Документы</p>
        <h1 className="mt-2 font-serif text-4xl text-navy">Реквизиты</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Меняются один раз здесь — автоматически обновляются в политике конфиденциальности,
          оферте, подвале сайта и на фирменном бланке документов.
        </p>
        <div className="mt-8">
          <PageEditor schema={REQUISITES_SCHEMA} />
        </div>
      </div>
    </div>
  );
}
