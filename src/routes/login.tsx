import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requestLoginCode, verifyLoginCode } from "@/lib/auth-otp.functions";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Вход — Полуостров" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const reqCode = useServerFn(requestLoginCode);
  const checkCode = useServerFn(verifyLoginCode);

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await reqCode({ data: { email: email.trim() } });
      if (!res.ok) {
        setError(res.error === "rate_limit"
          ? "Слишком много попыток. Подождите несколько минут."
          : "Не удалось отправить код. Попробуйте позже.");
        return;
      }
      setStep("code");
    } catch {
      setError("Не удалось отправить код. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await checkCode({ data: { email: email.trim(), code: code.trim() } });
      if (!res.ok) {
        const map: Record<string, string> = {
          wrong: "Неверный код.",
          expired: "Код истёк. Запросите новый.",
          too_many: "Слишком много попыток. Запросите новый код.",
          no_code: "Код не найден. Запросите новый.",
          link_failed: "Не удалось войти. Попробуйте ещё раз.",
        };
        setError(map[(res as { error?: string }).error ?? ""] ?? "Не удалось войти.");
        return;
      }
      const { error: vErr } = await supabase.auth.verifyOtp({
        token_hash: res.tokenHash,
        type: "magiclink",
      });
      if (vErr) {
        setError("Не удалось войти. Запросите новый код.");
        return;
      }
      navigate({ to: "/admin/bookings" });
    } catch {
      setError("Не удалось войти. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f2ee] px-4 py-16">
      <div className="w-full max-w-md border border-border bg-background p-10">
        <Link to="/" className="font-serif text-2xl text-navy">
          Полуостров
        </Link>
        <p className="mt-1 text-[10px] uppercase tracking-[3px] text-muted-foreground">
          Личный кабинет
        </p>

        <h1 className="mt-10 font-serif text-3xl text-navy">Вход</h1>

        {step === "email" ? (
          <form onSubmit={sendCode} className="mt-8 space-y-5">
            <p className="text-sm text-muted-foreground">
              Введите рабочий email — мы пришлём код для входа.
            </p>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-navy">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-[#C9A96E]"
                autoComplete="email"
                autoFocus
              />
            </div>

            {error && (
              <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a1a1a] py-4 text-[11px] uppercase tracking-[2px] text-white transition-colors hover:bg-[#C9A96E] disabled:opacity-50"
            >
              {loading ? "Отправляем…" : "Получить код"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-8 space-y-5">
            <p className="text-sm text-muted-foreground">
              Код отправлен на <span className="text-navy">{email.trim()}</span>. Введите его ниже.
            </p>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-navy">Код из письма</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-center text-2xl tracking-[8px] outline-none focus:border-[#C9A96E]"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            {error && (
              <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-[#1a1a1a] py-4 text-[11px] uppercase tracking-[2px] text-white transition-colors hover:bg-[#C9A96E] disabled:opacity-50"
            >
              {loading ? "Входим…" : "Войти"}
            </button>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => { setStep("email"); setCode(""); setError(null); }}
                className="underline hover:text-navy"
              >
                Изменить email
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => { setCode(""); void sendCode(new Event("submit") as unknown as FormEvent); }}
                className="underline hover:text-navy disabled:opacity-50"
              >
                Отправить код повторно
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
