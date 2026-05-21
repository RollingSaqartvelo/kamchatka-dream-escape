import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Phone, X } from "lucide-react";

export function FloatingWidgets() {
  const { t } = useTranslation();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      {/* Floating buttons (bottom-right stack) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <a
          href="tel:+79149945757"
          aria-label={t("widget.call")}
          className="grid h-12 w-12 place-items-center bg-cream text-navy shadow-lg ring-1 ring-navy/10 transition-transform hover:scale-105"
          style={{ borderRadius: "999px" }}
        >
          <Phone className="h-5 w-5" />
        </a>
        <button
          onClick={() => setChatOpen((v) => !v)}
          aria-label={t("widget.chat")}
          className="grid h-14 w-14 place-items-center bg-navy text-cream shadow-xl ring-2 ring-gold/30 transition-transform hover:scale-105"
          style={{ borderRadius: "999px" }}
        >
          {chatOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      </div>

      {/* Chat panel (Aurora placeholder — wired up in Этап 10) */}
      {chatOpen && (
        <div
          className="fixed bottom-28 right-6 z-40 flex w-[360px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden border border-border bg-background shadow-2xl"
          style={{ borderRadius: "2px", maxHeight: "70vh" }}
        >
          <div className="flex items-center gap-3 bg-navy px-5 py-4 text-cream">
            <div
              className="grid h-9 w-9 place-items-center bg-gold text-navy"
              style={{ borderRadius: "999px" }}
            >
              <span className="font-serif text-lg italic">A</span>
            </div>
            <div>
              <div className="font-serif text-base">Аврора</div>
              <div className="text-[10px] tracking-widest-plus uppercase text-cream/60">
                AI-консьерж
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-light-gray p-5 text-sm">
            <div className="rounded-sm bg-background px-4 py-3 shadow-sm">
              Здравствуйте! 👋 Я Аврора — ИИ-помощник отеля «Полуостров».
              <br />
              <span className="text-muted-foreground">
                Чат подключим на следующем этапе.
              </span>
            </div>
          </div>
          <div className="border-t border-border bg-background p-3">
            <input
              type="text"
              placeholder="Сообщение..."
              disabled
              className="w-full bg-light-gray px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60"
              style={{ borderRadius: "2px" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
