import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "@/integrations/supabase/staff-middleware";

// Управление сотрудниками — только для Шефа (роль admin).
// «Шеф» = admin, «Администратор» = manager. Вход у всех по ссылке на почту,
// поэтому пароли не нужны и нигде не хранятся.

type StaffRow = { userId: string; email: string; role: "admin" | "manager" };

// Найти всех пользователей с email через admin API (с пагинацией).
async function emailMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) if (u.email) map.set(u.id, u.email);
    if (data.users.length < 200) break;
    page += 1;
  }
  return map;
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<StaffRow[]> => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "manager"]);
    const emails = await emailMap();
    const seen = new Map<string, StaffRow>();
    for (const r of roles ?? []) {
      const role = r.role as "admin" | "manager";
      const prev = seen.get(r.user_id);
      // admin приоритетнее manager при отображении
      if (!prev || role === "admin") {
        seen.set(r.user_id, { userId: r.user_id, email: emails.get(r.user_id) ?? "—", role });
      }
    }
    return [...seen.values()].sort((a, b) => (a.role === b.role ? a.email.localeCompare(b.email) : a.role === "admin" ? -1 : 1));
  });

export const addStaff = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(
    z.object({
      email: z.string().trim().email().max(255),
      role: z.enum(["admin", "manager"]).default("manager"),
    }),
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();

    // Найти существующего пользователя по email
    const emails = await emailMap();
    let userId: string | undefined;
    for (const [id, e] of emails) if (e.toLowerCase() === email) userId = id;

    // Нет — создаём (без пароля; вход по ссылке на почту)
    if (!userId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (error || !created.user) throw new Error(`Не удалось создать пользователя: ${error?.message ?? ""}`);
      userId = created.user.id;
    }

    // Назначаем роль, если ещё не назначена
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!(existing ?? []).some((r) => r.role === data.role)) {
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });
      if (error) throw new Error(`Не удалось назначить роль: ${error.message}`);
    }
    return { ok: true };
  });

export const removeStaff = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    // Нельзя удалить самого себя (чтобы Шеф не потерял доступ)
    if (data.userId === context.userId) {
      throw new Error("Нельзя снять доступ с самого себя");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .in("role", ["admin", "manager"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
