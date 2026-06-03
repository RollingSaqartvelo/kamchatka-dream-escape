import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

// Ограничение частоты публичных действий. Работает «fail-open»: при сбое
// инфраструктуры (нет IP / ошибка БД) действие НЕ блокируется, чтобы не
// ломать обычных гостей.

function svc() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export function getClientIp(): string {
  const h = getRequest()?.headers;
  const raw =
    h?.get("cf-connecting-ip") ||
    h?.get("x-forwarded-for")?.split(",")[0] ||
    h?.get("x-real-ip") ||
    "";
  return raw.trim() || "unknown";
}

// Возвращает true, если действие разрешено (лимит не превышен).
export async function checkRateLimit(
  action: string,
  opts: { max: number; windowSec: number },
): Promise<boolean> {
  const ip = getClientIp();
  if (ip === "unknown") return true; // не смогли определить источник — не блокируем
  try {
    const { data, error } = await svc().rpc("hit_rate_limit", {
      p_key: `${action}:${ip}`,
      p_max: opts.max,
      p_window_seconds: opts.windowSec,
    });
    if (error) return true; // fail-open
    return data !== false;
  } catch {
    return true; // fail-open
  }
}

// Бросает ошибку, если лимит превышен (для функций, которые просто падают).
export async function enforceRateLimit(action: string, opts: { max: number; windowSec: number }) {
  const ok = await checkRateLimit(action, opts);
  if (!ok) throw new Error("Слишком много запросов. Пожалуйста, попробуйте через несколько минут.");
}
