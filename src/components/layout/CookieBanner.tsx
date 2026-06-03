import { useEffect, useState } from "react";

// Баннер уведомления о cookie. Показывается один раз; выбор хранится в localStorage.
const KEY = "cookie-consent-v1";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* localStorage недоступен — баннер не показываем */
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-[80] border-t border-border bg-navy/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-4 text-sm text-cream/90 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="leading-relaxed">
          Мы используем файлы cookie для работы сайта и удобства. Продолжая пользоваться сайтом, вы
          соглашаетесь с этим и с{" "}
          <a href="/privacy" className="text-gold underline">
            Политикой обработки персональных данных
          </a>
          .
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 bg-cream px-6 py-2.5 text-[11px] uppercase tracking-widest text-navy transition-colors hover:bg-gold"
        >
          Принять
        </button>
      </div>
    </div>
  );
}
