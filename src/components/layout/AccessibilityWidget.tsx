import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

type FontSize = "normal" | "large" | "xlarge";
type Theme = "normal" | "contrast";

const STORAGE_KEY = "a11y_prefs";

function loadPrefs(): { fontSize: FontSize; theme: Theme } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { fontSize: "normal", theme: "normal" };
}

function applyPrefs(fontSize: FontSize, theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("a11y-large", "a11y-xlarge", "a11y-contrast");
  if (fontSize === "large") root.classList.add("a11y-large");
  if (fontSize === "xlarge") root.classList.add("a11y-xlarge");
  if (theme === "contrast") root.classList.add("a11y-contrast");
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [theme, setTheme] = useState<Theme>("normal");

  useEffect(() => {
    const prefs = loadPrefs();
    setFontSize(prefs.fontSize);
    setTheme(prefs.theme);
    applyPrefs(prefs.fontSize, prefs.theme);
  }, []);

  function update(newSize: FontSize, newTheme: Theme) {
    setFontSize(newSize);
    setTheme(newTheme);
    applyPrefs(newSize, newTheme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontSize: newSize, theme: newTheme }));
  }

  function reset() {
    update("normal", "normal");
  }

  return (
    <>
      {/* Кнопка */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Настройки доступности"
        title="Настройки доступности"
        className="fixed bottom-6 left-6 z-50 grid h-12 w-12 place-items-center bg-navy text-cream shadow-lg ring-2 ring-gold/30 transition-transform hover:scale-105 print:hidden"
        style={{ borderRadius: "999px" }}
      >
        <Eye className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </button>

      {/* Панель */}
      {open && (
        <div
          className="fixed bottom-24 left-6 z-50 w-72 bg-background border border-border shadow-2xl overflow-hidden print:hidden"
          style={{ borderRadius: "4px" }}
          role="dialog"
          aria-label="Настройки доступности"
        >
          {/* Шапка */}
          <div className="flex items-center justify-between bg-navy px-5 py-3">
            <span className="font-serif text-sm text-cream">Доступность</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Закрыть панель доступности"
              className="text-cream/60 hover:text-cream text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Размер текста */}
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
                Размер текста
              </p>
              <div className="flex gap-2">
                {([
                  { value: "normal", label: "А", title: "Обычный", size: "text-sm" },
                  { value: "large", label: "А", title: "Крупный", size: "text-base" },
                  { value: "xlarge", label: "А", title: "Очень крупный", size: "text-xl" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update(opt.value, theme)}
                    aria-pressed={fontSize === opt.value}
                    title={opt.title}
                    className={`flex-1 py-2 border transition-colors font-bold ${opt.size} ${
                      fontSize === opt.value
                        ? "bg-navy text-cream border-navy"
                        : "border-border text-navy hover:border-navy"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Контрастность */}
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
                Контрастность
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => update(fontSize, "normal")}
                  aria-pressed={theme === "normal"}
                  className={`flex-1 py-2 border text-[11px] uppercase tracking-widest transition-colors ${
                    theme === "normal"
                      ? "bg-navy text-cream border-navy"
                      : "border-border text-navy hover:border-navy"
                  }`}
                >
                  Обычная
                </button>
                <button
                  onClick={() => update(fontSize, "contrast")}
                  aria-pressed={theme === "contrast"}
                  className={`flex-1 py-2 border text-[11px] uppercase tracking-widest transition-colors ${
                    theme === "contrast"
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "border-border text-navy hover:border-navy"
                  }`}
                >
                  Высокая
                </button>
              </div>
            </div>

            {/* Сброс */}
            {(fontSize !== "normal" || theme !== "normal") && (
              <button
                onClick={reset}
                className="w-full py-2 text-[11px] uppercase tracking-widest text-muted-foreground border border-border hover:border-navy hover:text-navy transition-colors"
              >
                Сбросить настройки
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
