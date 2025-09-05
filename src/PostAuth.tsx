import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

export default function PostAuth() {
  const nav = useNavigate();

  useEffect(() => {
    const go = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return nav("/", { replace: true });

      // Ensure profile exists (no DB trigger needed)
      const { data } = await supabase
        .from("profiles")
        .select("id, onboarded_at, role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!data) {
        await supabase.from("profiles").insert({ id: session.user.id });
      }

      // Set isSuper flag for convenience
      localStorage.setItem("isSuper", data?.role === "superadmin" ? "1" : "0");

      const intent = (sessionStorage.getItem("authIntent") || "") as
        | "signup"
        | "login";
      sessionStorage.removeItem("authIntent");

      const needsOnboarding = intent === "signup" || !data?.onboarded_at;
      nav(needsOnboarding ? "/onboarding" : "/dashboard", { replace: true });
    };
    go();
  }, [nav]);

  return <div className="p-6 text-center">Signing you in…</div>;
}
