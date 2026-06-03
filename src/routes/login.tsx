import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Шаг 1 — отправить код на почту
  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false }, // вход только для существующих пользователей
    });
    setLoading(false);
    if (error) {
      setError(
        /not allowed|not found|no user/i.test(error.message)
          ? "Пользователь с таким email не найден. Зарегистрируйтесь."
          : error.message,
      );
      return;
    }
    setStep("code");
  }

  // Шаг 2 — проверить код и войти
  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (error || !data.user) {
      setLoading(false);
      setError("Неверный или просроченный код");
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    setLoading(false);
    const isStaff = (roles ?? []).some((r) => r.role === "admin" || r.role === "manager");
    navigate({ to: isStaff ? "/admin/bookings" : "/account" });
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
              Введите email — мы отправим одноразовый код для входа. Пароль не нужен.
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
          <form onSubmit={verify} className="mt-8 space-y-5">
            <p className="text-sm text-muted-foreground">
              Код отправлен на <span className="text-navy">{email}</span>. Введите его ниже.
            </p>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-navy">Код из письма</label>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-center font-mono text-lg tracking-[6px] outline-none focus:border-[#C9A96E]"
                autoComplete="one-time-code"
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
              {loading ? "Проверяем…" : "Войти"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="w-full text-[11px] uppercase tracking-widest text-muted-foreground hover:text-navy"
            >
              ← Изменить email / отправить заново
            </button>
          </form>
        )}

        <p className="mt-8 text-xs text-muted-foreground">
          Нет аккаунта?{" "}
          <Link to="/signup" className="text-navy underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </main>
  );
}
