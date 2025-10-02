import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function PostAuth() {
  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (window.location.hash) {
          const params = new URLSearchParams(window.location.hash.slice(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw error;
          }
        }

        // Check for next parameter to redirect after successful auth
        const nextParam = url.searchParams.get("next");
        if (nextParam) {
          window.location.replace(nextParam);
        } else {
          window.location.replace("/#"); // default behavior
        }
      } catch (e) {
        console.error(e);
        window.location.replace("/login?auth_error=1");
      }
    };
    run();
  }, []);

  return (
    <div style={{ padding: 24, textAlign: "center" }}>Signing you in…</div>
  );
}
