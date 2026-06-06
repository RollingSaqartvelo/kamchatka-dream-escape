import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/useAuth";
import { sendTestEmail } from "@/lib/email.functions";
import { sendTelegramTest } from "@/lib/telegram.functions";
import { syncTravellineReservations } from "@/lib/travelline-sync.functions";

export const Route = createFileRoute("/admin/dev")({
  component: AdminDevPage,
  head: () => ({
    meta: [
      { title: "Для разработчика — Админка «Полуостров»" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const TEST_EMAIL_TO = "poluostrovkam@mail.ru";

function AdminDevPage() {
  const { isAdmin, loading } = useAuth();
  const syncFn = useServerFn(syncTravellineReservations);
  const sendTestEmailFn = useServerFn(sendTestEmail);
  const sendTelegramTestFn = useServerFn(sendTelegramTest);

  const [busy, setBusy] = useState<string | null>(null);

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-serif text-3xl text-navy">Только для владельца</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Эта страница доступна только Шефу (роль admin).
        </p>
      </div>
    );
  }

  async function resetSync() {
    if (!confirm("Сбросить курсор TravelLine и начать импорт со свежих модификаций (последние 30 дней)?")) return;
    setBusy("sync");
    try {
      const now = new Date();
      const stayFrom = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
      const stayTo = format(endOfMonth(addMonths(now, 2)), "yyyy-MM-dd");
      const res = await syncFn({ data: { stayFrom, stayTo, reset: true } });
      if ((res as any).ok) toast.success(`Синхронизация сброшена · +${(res as any).synced} броней`);
      else toast.error(`Ошибка TravelLine: ${(res as any).error}`);
    } catch (e) {
      toast.error("Не удалось подключиться к TravelLine");
      console.error(e);
    } finally {
      setBusy(null);
    }
  }

  async function testEmail() {
    setBusy("email");
    try {
      const res = await sendTestEmailFn({ data: { to: TEST_EMAIL_TO } });
      if ((res as any).ok) toast.success(`Тестовое письмо отправлено на ${TEST_EMAIL_TO}`);
      else toast.error(`Ошибка отправки: ${(res as any).error}`);
    } catch (e) {
      toast.error("Не удалось отправить письмо");
      console.error(e);
    } finally {
      setBusy(null);
    }
  }

  async function testTelegram() {
    setBusy("tg");
    try {
      const res = await sendTelegramTestFn({});
      if (res.ok) toast.success("Тестовое сообщение отправлено в Telegram!");
      else toast.error("Ошибка: проверь TELEGRAM_BOT_TOKEN и TELEGRAM_ADMIN_CHAT_ID");
    } catch (e) {
      toast.error("Не удалось отправить в Telegram");
      console.error(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[11px] uppercase tracking-widest text-red-600">⚠ Зона повышенной опасности</p>
        <h1 className="mt-2 font-serif text-4xl text-navy">Для разработчика</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Служебные кнопки. Нажимайте, только если точно понимаете, что делаете.
        </p>

        <div className="relative mt-10 overflow-hidden rounded-2xl border-2 border-dashed border-yellow-500/70 bg-yellow-50/40 p-6">
          {/* фоновый ковёр из мелких значков радиации */}
          <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden text-[11px] leading-[18px] tracking-[0.25em] text-yellow-500/20">
            {Array.from({ length: 22 }).map((_, i) => (
              <div key={i}>☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️☢️</div>
            ))}
          </div>
          <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-3">
            <NukeButton
              label="Сброс + свежие"
              sub="Сброс курсора TravelLine"
              icon="↻↻"
              busy={busy === "sync"}
              disabled={busy !== null}
              onClick={() => void resetSync()}
            />
            <NukeButton
              label="Тест email"
              sub={TEST_EMAIL_TO}
              icon="✉"
              busy={busy === "email"}
              disabled={busy !== null}
              onClick={() => void testEmail()}
            />
            <NukeButton
              label="Тест TG"
              sub="Telegram-бот"
              icon="✈"
              busy={busy === "tg"}
              disabled={busy !== null}
              onClick={() => void testTelegram()}
            />
          </div>
        </div>

        <p className="mt-12 text-center text-sm font-bold text-navy">
          Кнопки предназначены исключительно для пользователя Смирнов Сергей Романович.
          При нажатии Вы рискуете взорвать систему 💥
        </p>
      </div>
    </div>
  );
}

function NukeButton({
  label,
  sub,
  icon,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  sub: string;
  icon: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative flex flex-col items-center justify-center gap-2 rounded-2xl border-4 border-red-900 bg-gradient-to-b from-red-500 to-red-700 px-4 py-8 text-white shadow-[0_8px_0_0_#7f1d1d,0_12px_18px_rgba(0,0,0,0.35)] transition-all hover:from-red-400 hover:to-red-600 active:translate-y-1.5 active:shadow-[0_2px_0_0_#7f1d1d,0_4px_8px_rgba(0,0,0,0.35)] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0"
    >
      <span className="absolute inset-1.5 rounded-xl ring-2 ring-inset ring-red-300/40" />
      <span className="text-3xl drop-shadow">{icon}</span>
      <span className="text-sm font-black uppercase tracking-widest drop-shadow">
        {busy ? "…" : label}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-red-100/90">{sub}</span>
    </button>
  );
}
