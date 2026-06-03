import type { ReactNode } from "react";
import logoDark from "@/assets/logo-poluostrov-dark.svg";

// Фирменный бланк для юридических документов (политика, оферта).
// На экране — обычная страница; кнопка «Скачать PDF» вызывает печать браузера,
// при этом скрывается всё лишнее (шапка/подвал сайта), остаётся только бланк.
export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-background py-16 print:py-0">
      <style>{`@media print {
        header, footer, .no-print { display: none !important; }
        body { background: #fff !important; }
        .legal-doc { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: 100% !important; }
      }`}</style>

      <div className="legal-doc mx-auto max-w-3xl border border-beige bg-white px-6 py-10 sm:px-12 sm:py-14">
        {/* Шапка-бланк */}
        <div className="flex flex-col items-center border-b border-beige pb-8 text-center">
          <img src={logoDark} alt="Полуостров" className="h-16 w-auto" />
          <div className="mt-4 text-xs leading-relaxed text-muted-foreground">
            ИП Смирнов Роман Яковлевич · ИНН 772400271482<br />
            г. Петропавловск-Камчатский, ул. Пограничная, д. 30, кв. 36<br />
            Гостиница «Полуостров» · ул. Абеля, 41 · +7 (914) 994-57-57 · poluostrovkam@mail.ru
          </div>
        </div>

        <div className="mt-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-navy sm:text-3xl">{title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">Редакция от {updated}</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print shrink-0 border border-navy px-4 py-2 text-[11px] uppercase tracking-widest text-navy transition-colors hover:bg-navy hover:text-cream"
          >
            Скачать PDF
          </button>
        </div>

        <div className="legal-body mt-8 space-y-5 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

// Заголовок раздела документа.
export function LegalH({ children }: { children: ReactNode }) {
  return <h2 className="pt-4 font-serif text-lg text-navy">{children}</h2>;
}
