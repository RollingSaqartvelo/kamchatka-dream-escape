import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole = "admin" | "manager" | "user";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // defer to next tick to avoid recursive supabase calls inside listener
        setTimeout(() => {
          loadRoles(s.user.id).finally(() => setLoading(false));
        }, 0);
      } else {
        setRoles([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadRoles(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadRoles(uid: string) {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    if (error) {
      console.error(error);
      setRoles([]);
      return;
    }
    setRoles((data ?? []).map((r) => r.role as StaffRole));
  }

  return {
    session,
    user,
    roles,
    isStaff: roles.includes("admin") || roles.includes("manager"),
    isAdmin: roles.includes("admin"),
    loading,
    signOut: () => supabase.auth.signOut(),
  };
}
