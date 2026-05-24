import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Регистрация — Полуостров" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
        data: { first_name: firstName, last_name: lastName },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message === "User already registered"
        ? "Этот email уже зарегистрирован. Войдите."
        : error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/account" });
    } else {
      setSent(true);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-16">
      <div className="w-full max-w-md border border-beige bg-background p-10">
        <Link to="/" className="font-serif text-2xl text-navy">
          Полуостров
        </Link>
        <p className="mt-1 text-[10px] uppercase tracking-[3px] text-muted-foreground">
          Личный кабинет гостя
        </p>

        {sent ? (
          <>
            <h1 className="mt-10 font-serif text-3xl text-navy">Проверьте почту</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Мы отправили письмо для подтверждения на <span className="text-navy">{email}</span>.
              Перейдите по ссылке из письма, чтобы активировать аккаунт.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-10 font-serif text-3xl text-navy">Регистрация</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Чтобы хранить данные брони и быстро бронировать снова.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Имя" value={firstName} onChange={setFirstName} />
                <Input label="Фамилия" value={lastName} onChange={setLastName} />
              </div>
              <Input label="Email*" type="email" value={email} onChange={setEmail} required />
              <Input label="Пароль*" type="password" value={password} onChange={setPassword} required />

              {error && (
                <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy py-4 text-[11px] uppercase tracking-[2px] text-cream transition-colors hover:bg-gold disabled:opacity-50"
              >
                {loading ? "Создаём…" : "Создать аккаунт"}
              </button>
            </form>

            <p className="mt-6 text-xs text-muted-foreground">
              Уже зарегистрированы?{" "}
              <Link to="/login" className="text-navy underline">
                Войти
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-navy">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-gold"
      />
    </label>
  );
}
