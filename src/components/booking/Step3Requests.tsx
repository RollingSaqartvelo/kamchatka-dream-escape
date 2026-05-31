import { useTranslation } from "react-i18next";
import type { BookingState } from "./types";
import { SPECIAL_REQUEST_OPTIONS } from "./types";
import { StaySummary } from "./StaySummary";
import { cn } from "@/lib/utils";

type Props = {
  state: BookingState;
  onRequestsChange: (v: string[]) => void;
  onCustomChange: (v: string) => void;
  onEditStep: (step: 1 | 2 | 3) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function Step3Requests({
  state,
  onRequestsChange,
  onCustomChange,
  onEditStep,
  onContinue,
  onBack,
}: Props) {
  const { t } = useTranslation();
  const toggle = (value: string) => {
    if (state.requests.includes(value)) {
      onRequestsChange(state.requests.filter((r) => r !== value));
    } else {
      onRequestsChange([...state.requests, value]);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px] lg:py-16">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#C9A96E]">
          {t("booking.step3.eyebrow")}
        </p>
        <h1 className="mt-3 font-serif text-4xl text-navy sm:text-5xl">
          {t("booking.step3.title")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("booking.step3.intro")}
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {SPECIAL_REQUEST_OPTIONS.map(({ value, key }) => {
            const checked = state.requests.includes(value);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(value)}
                className={cn(
                  "flex items-center gap-3 border bg-card px-4 py-4 text-left text-[11px] uppercase tracking-[1px] transition-colors",
                  checked
                    ? "border-[#C9A96E] bg-[#C9A96E]/5 text-navy"
                    : "border-border text-muted-foreground hover:border-[#C9A96E]",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center border",
                    checked ? "border-[#C9A96E] bg-[#C9A96E] text-white" : "border-border",
                  )}
                >
                  {checked && (
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                      <path
                        d="M3 8.5l3 3 7-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                {t(`booking.step3.options.${key}`)}
              </button>
            );
          })}
        </div>

        <div className="mt-10">
          <label className="text-[11px] uppercase tracking-widest text-navy">
            {t("booking.step3.customLabel")}
          </label>
          <textarea
            value={state.customRequest}
            onChange={(e) => onCustomChange(e.target.value.slice(0, 500))}
            placeholder={t("booking.step3.customPh")}
            rows={4}
            className="mt-3 w-full resize-none border border-border bg-background p-4 text-sm text-navy outline-none focus:border-[#C9A96E]"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {state.customRequest.length} / 500
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="text-[11px] uppercase tracking-widest text-muted-foreground hover:text-navy"
          >
            {t("booking.step3.back")}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="bg-[#1a1a1a] px-10 py-4 text-[11px] uppercase tracking-[2px] text-white transition-colors hover:bg-[#C9A96E]"
          >
            {t("booking.step3.continue")}
          </button>
        </div>
      </div>

      <StaySummary state={state} onEditStep={onEditStep} />
    </div>
  );
}
