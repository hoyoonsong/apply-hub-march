import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { getCachedProfile } from "../lib/profileCache";

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

  // Check for deleted users periodically (reduced frequency to minimize requests)
  // Only check when user changes, not on every render
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const checkUserStatus = async () => {
      if (!isMounted) return;
      try {
        // Use cached profile query to avoid repeated API calls
        const profile = await getCachedProfile(user.id);

        if (isMounted && profile?.deleted_at) {
          console.log("User is soft deleted, signing out");
          await supabase.auth.signOut();
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error checking user status:", error);
        }
      }
    };

    // Check immediately on mount
    checkUserStatus();

    // Check every 5 minutes instead of 2 minutes (further reduces requests)
    // User deletion is very rare, so less frequent checks are acceptable
    const interval = setInterval(checkUserStatus, 300000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id]); // Only re-run when user ID changes, not on every user object change

  return <Ctx.Provider value={{ loading, user }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
