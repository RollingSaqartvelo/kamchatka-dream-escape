import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Даты и гости" },
  { n: 2, label: "Выбор номера" },
  { n: 3, label: "Пожелания" },
  { n: 4, label: "Подтверждение" },
] as const;

export function BookingProgress({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-5 sm:px-6 sm:py-6">
        {STEPS.map((s, i) => {
          const done = step > s.n;
          const current = step === s.n;
          return (
            <div key={s.n} className="flex flex-1 items-center gap-3">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs transition-colors",
                    done && "border-[#C9A96E] bg-[#C9A96E] text-white",
                    current && !done && "border-[#1a1a1a] bg-[#1a1a1a] text-white",
                    !done && !current && "border-border bg-cream text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : s.n}
                </div>
                <span
                  className={cn(
                    "hidden text-[10px] uppercase tracking-widest sm:inline sm:text-[11px]",
                    done && "text-[#C9A96E]",
                    current && !done && "text-navy underline underline-offset-4",
                    !done && !current && "text-muted-foreground",
                  )}
                >
                  {s.n.toString().padStart(2, "0")} — {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px flex-1 transition-colors",
                    step > s.n ? "bg-[#C9A96E]" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
