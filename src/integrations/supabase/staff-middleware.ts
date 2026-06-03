import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

// Авторизация ПЕРСОНАЛА: валидирует токен И проверяет роль admin/manager.
// Привилегированные серверные функции используют service-role (в обход RLS),
// поэтому проверки «токен валиден» недостаточно — иначе любой
// зарегистрированный гость мог бы читать данные всех гостей.
export const requireStaff = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const ANON = process.env.SUPABASE_PUBLISHABLE_KEY;
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !ANON || !SERVICE) {
    throw new Error("Server misconfigured: missing Supabase environment variables");
  }

  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.slice("Bearer ".length);
  if (!token) throw new Error("Unauthorized");

  // 1) Валидируем токен → user id
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  if (claimsErr || !userId) throw new Error("Unauthorized: invalid token");

  // 2) Проверяем роль через service-role (читаем user_roles в обход RLS)
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
  const { data: roles, error: rolesErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (rolesErr) throw new Error("Forbidden: role check failed");
  const isStaff = (roles ?? []).some((r) => r.role === "admin" || r.role === "manager");
  if (!isStaff) throw new Error("Forbidden: staff role required");

  return next({ context: { userId, supabase: userClient } });
});

// Авторизация ШЕФА: только роль admin (для управления сотрудниками, контентом сайта).
export const requireAdmin = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const ANON = process.env.SUPABASE_PUBLISHABLE_KEY;
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !ANON || !SERVICE) {
    throw new Error("Server misconfigured: missing Supabase environment variables");
  }

  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.slice("Bearer ".length);
  if (!token) throw new Error("Unauthorized");

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  if (claimsErr || !userId) throw new Error("Unauthorized: invalid token");

  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
  const { data: roles, error: rolesErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (rolesErr) throw new Error("Forbidden: role check failed");
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  if (!isAdmin) throw new Error("Forbidden: admin role required");

  return next({ context: { userId, supabase: userClient } });
});
