import { useEffect, useState } from "react";
import { BookingProgress } from "./BookingProgress";
import { Step1Dates } from "./Step1Dates";
import { Step2Rooms } from "./Step2Rooms";
import { Step3Requests } from "./Step3Requests";
import { Step4Confirm } from "./Step4Confirm";
import { LoadingScreen } from "./LoadingScreen";
import { initialBooking, type BookingState } from "./types";

export function BookingWizard() {
  const [state, setState] = useState<BookingState>(initialBooking);
  const [loading, setLoading] = useState(false);

  const patch = (p: Partial<BookingState>) => setState((s) => ({ ...s, ...p }));
  const goto = (step: 1 | 2 | 3 | 4) => setState((s) => ({ ...s, step }));

  const goToStep2 = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      goto(2);
    }, 1400);
  };

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state.step]);

  return (
    <>
      {loading && <LoadingScreen />}
      <BookingProgress step={state.step} />

      {state.step === 1 && (
        <Step1Dates
          dates={state.dates}
          onDatesChange={(v) => patch({ dates: v })}
          party={state.party}
          onPartyChange={(v) => patch({ party: v })}
          promoCode={state.promoCode}
          onPromoChange={(v) => patch({ promoCode: v })}
          onContinue={goToStep2}
        />
      )}

      {state.step === 2 && (
        <Step2Rooms
          state={state}
          onSelect={(sel) => patch({ selected: sel })}
          onEditStep={goto}
          onContinue={() => goto(3)}
        />
      )}

      {state.step === 3 && (
        <Step3Requests
          state={state}
          onRequestsChange={(v) => patch({ requests: v })}
          onCustomChange={(v) => patch({ customRequest: v })}
          onEditStep={goto}
          onContinue={() => goto(4)}
          onBack={() => goto(2)}
        />
      )}

      {state.step === 4 && (
        <Step4Confirm
          state={state}
          patch={patch}
          onEditStep={goto}
          onBack={() => goto(3)}
        />
      )}
    </>
  );
}
