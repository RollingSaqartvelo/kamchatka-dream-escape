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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Неверный email или пароль");
      return;
    }
    navigate({ to: "/admin/bookings" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f2ee] px-4 py-16">
      <div className="w-full max-w-md border border-border bg-background p-10">
        <Link to="/" className="font-serif text-2xl text-navy">
          Полуостров
        </Link>
        <p className="mt-1 text-[10px] uppercase tracking-[3px] text-muted-foreground">
          Панель управления
        </p>

        <h1 className="mt-10 font-serif text-3xl text-navy">Вход для сотрудников</h1>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
          <div>
            <label className="text-[11px] uppercase tracking-widest text-navy">Пароль</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-[#C9A96E]"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a1a1a] py-4 text-[11px] uppercase tracking-[2px] text-white transition-colors hover:bg-[#C9A96E] disabled:opacity-50"
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>

        <p className="mt-8 text-xs text-muted-foreground">
          Доступ предоставляется администратором отеля.
        </p>
      </div>
    </main>
  );
}
