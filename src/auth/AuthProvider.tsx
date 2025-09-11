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

  // Check for deleted users periodically
  useEffect(() => {
    if (!user) return;

    const checkUserStatus = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("deleted_at")
          .eq("id", user.id)
          .single();

        if (profile?.deleted_at) {
          console.log("User is soft deleted, signing out");
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.error("Error checking user status:", error);
      }
    };

    // Check immediately
    checkUserStatus();

    // Check every 30 seconds
    const interval = setInterval(checkUserStatus, 30000);

    return () => clearInterval(interval);
  }, [user]);

  return <Ctx.Provider value={{ loading, user }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
