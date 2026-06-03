import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Отправить ссылку для входа на почту (passwordless magic link).
  async function sendLink(e: FormEvent) {
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
        /not allowed|not found|no user|signups not allowed/i.test(error.message)
          ? "Пользователь с таким email не найден. Зарегистрируйтесь."
          : error.message,
      );
      return;
    }
    setSent(true);
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

        {sent ? (
          <>
            <h1 className="mt-10 font-serif text-3xl text-navy">Проверьте почту</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Мы отправили ссылку для входа на <span className="text-navy">{email}</span>.
              Откройте письмо и нажмите кнопку «Войти» — вы попадёте в личный кабинет.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Не пришло? Проверьте папку «Спам» или{" "}
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setError(null);
                }}
                className="text-navy underline"
              >
                отправьте снова
              </button>
              .
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-10 font-serif text-3xl text-navy">Вход</h1>
            <form onSubmit={sendLink} className="mt-8 space-y-5">
              <p className="text-sm text-muted-foreground">
                Введите email — мы отправим ссылку для входа. Пароль не нужен.
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
                {loading ? "Отправляем…" : "Получить ссылку для входа"}
              </button>
            </form>
          </>
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
