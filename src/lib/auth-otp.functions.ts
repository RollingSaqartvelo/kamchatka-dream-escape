import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { checkRateLimit } from "./rate-limit";
import { sendViaResend } from "./email.functions";

// Вход в кабинет по одноразовому коду из письма (свой OTP, без SMTP gotrue).
// Поток: requestLoginCode (шлём код на почту) → verifyLoginCode (сверяем код →
// admin generateLink magiclink → клиент делает verifyOtp(token_hash) → сессия).
// Доступ только для существующих сотрудников (admin/manager); чужим — молчим.

function admin(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function hashCode(code: string, email: string): string {
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return crypto.createHash("sha256").update(`${code}:${email}:${pepper}`).digest("hex");
}

// Возвращает id пользователя, если это сотрудник (admin/manager), иначе null.
async function findStaffUserId(db: SupabaseClient, email: string): Promise<string | null> {
  let page = 1;
  let userId: string | null = null;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) { userId = u.id; break; }
    if (data.users.length < 200) break;
    page += 1;
  }
  if (!userId) return null;
  const { data: roles } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "manager"]);
  return roles && roles.length ? userId : null;
}

function codeEmailHtml(code: string): string {
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"></head>
<body style="font-family:Georgia,serif;background:#f5f2ee;margin:0;padding:0;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);">
    <div style="background:#1a1a2e;padding:24px 32px;text-align:center;">
      <p style="color:#C9A96E;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Личный кабинет</p>
      <h1 style="color:#fff;font-size:22px;margin:0;font-weight:400;">Полуостров</h1>
    </div>
    <div style="padding:32px;text-align:center;color:#1a1a2e;">
      <p style="font-size:14px;color:#666;margin:0 0 20px;">Код для входа в личный кабинет:</p>
      <p style="font-size:38px;letter-spacing:10px;font-weight:bold;margin:0;color:#1a1a2e;">${code}</p>
      <p style="font-size:13px;color:#999;margin:20px 0 0;">Код действует 10 минут. Если вы не запрашивали вход — просто проигнорируйте это письмо.</p>
    </div>
    <div style="background:#f5f2ee;padding:16px 32px;text-align:center;border-top:1px solid #e8e4de;">
      <p style="color:#999;font-size:11px;margin:0;">Это автоматическое письмо. Гостиница «Полуостров» · +7 (914) 994-57-57</p>
    </div>
  </div>
</body></html>`;
}

// Шаг 1 — запросить код на почту.
export const requestLoginCode = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().trim().email().max(255) }))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    // Защита от перебора: не больше 6 запросов за 10 минут с IP.
    if (!(await checkRateLimit("login-code", { max: 6, windowSec: 600 }))) {
      return { ok: false as const, error: "rate_limit" };
    }
    const db = admin();
    const userId = await findStaffUserId(db, email);
    // Не раскрываем, существует ли аккаунт — всегда отвечаем ok.
    if (!userId) return { ok: true as const };

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    await db.from("login_codes").upsert({
      email,
      code_hash: hashCode(code, email),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      attempts: 0,
      created_at: new Date().toISOString(),
    });
    await sendViaResend(email, "Код для входа — Полуостров", codeEmailHtml(code)).catch((e) =>
      console.error("login code email failed:", e),
    );
    return { ok: true as const };
  });

// Шаг 2 — проверить код. При успехе возвращает token_hash для verifyOtp на клиенте.
export const verifyLoginCode = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().trim().email().max(255),
      code: z.string().trim().regex(/^\d{6}$/),
    }),
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const db = admin();
    const { data: row } = await db
      .from("login_codes")
      .select("code_hash, expires_at, attempts")
      .eq("email", email)
      .maybeSingle();

    if (!row) return { ok: false as const, error: "no_code" };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await db.from("login_codes").delete().eq("email", email);
      return { ok: false as const, error: "expired" };
    }
    if (row.attempts >= 5) {
      await db.from("login_codes").delete().eq("email", email);
      return { ok: false as const, error: "too_many" };
    }
    if (hashCode(data.code, email) !== row.code_hash) {
      await db.from("login_codes").update({ attempts: row.attempts + 1 }).eq("email", email);
      return { ok: false as const, error: "wrong" };
    }

    await db.from("login_codes").delete().eq("email", email);
    const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = (link as any)?.properties?.hashed_token as string | undefined;
    if (error || !tokenHash) {
      console.error("generateLink failed:", error);
      return { ok: false as const, error: "link_failed" };
    }

    // Меняем token_hash на готовую сессию на сервере (надёжнее клиентского
    // verifyOtp, который ломается в PKCE-режиме). Возвращаем токены → setSession.
    const anon = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const vr = await fetch(`${process.env.SUPABASE_URL}/auth/v1/verify`, {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", token_hash: tokenHash }),
    });
    const session = (await vr.json().catch(() => null)) as
      | { access_token?: string; refresh_token?: string }
      | null;
    if (!vr.ok || !session?.access_token || !session?.refresh_token) {
      console.error("verify token_hash failed:", vr.status, session);
      return { ok: false as const, error: "link_failed" };
    }
    return {
      ok: true as const,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    };
  });
