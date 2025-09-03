import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";

type Auth = {
  loading: boolean;
  user: import("@supabase/supabase-js").User | null;
};
const Ctx = createContext<Auth>({ loading: true, user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(
    null
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setUser(sess?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ loading, user }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
