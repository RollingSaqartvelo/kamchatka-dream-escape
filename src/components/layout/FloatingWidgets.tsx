import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Phone, Send, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { auroraChat } from "@/lib/aurora.functions";

type Msg = { role: "user" | "assistant"; content: string };

export function FloatingWidgets() {
  const { t, i18n } = useTranslation();
  const greeting: Msg = { role: "assistant", content: t("widget.greeting") };
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([greeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const callChat = useServerFn(auroraChat);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (chatOpen) inputRef.current?.focus();
  }, [chatOpen]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const stream = await callChat({
        data: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          lang: i18n.language,
        },
      });
      for await (const chunk of stream as AsyncIterable<{ delta: string }>) {
        if (!chunk?.delta) continue;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = {
            ...last,
            content: last.content + chunk.delta,
          };
          return copy;
        });
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: t("widget.errFallback"),
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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

      {chatOpen && (
        <div
          className="fixed bottom-28 right-6 z-40 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden border border-border bg-background shadow-2xl"
          style={{ borderRadius: "2px", maxHeight: "75vh", height: "560px" }}
        >
          <div className="flex items-center gap-3 bg-navy px-5 py-4 text-cream">
            <div
              className="grid h-9 w-9 place-items-center bg-gold text-navy"
              style={{ borderRadius: "999px" }}
            >
              <span className="font-serif text-lg italic">A</span>
            </div>
            <div>
              <div className="font-serif text-base">Aurora</div>
              <div className="text-[10px] tracking-widest-plus uppercase text-cream/60">
                {t("widget.online")}
              </div>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-light-gray p-5 text-sm"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap px-4 py-2.5 shadow-sm ${
                    m.role === "user"
                      ? "bg-navy text-cream"
                      : "bg-background text-foreground"
                  }`}
                  style={{ borderRadius: "2px" }}
                >
                  {m.content || (
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-border bg-background p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("widget.msgPh")}
              aria-label={t("widget.msgPh")}
              disabled={loading}
              className="flex-1 bg-light-gray px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
              style={{ borderRadius: "2px" }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid h-9 w-9 place-items-center bg-navy text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ borderRadius: "2px" }}
              aria-label={t("widget.send")}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
