import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ApplicationForm from "./ApplicationForm";

export default function DirectApplication() {
  const { programId } = useParams();
  const [appId, setAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false); // Prevent duplicate concurrent calls

  useEffect(() => {
    // Prevent duplicate calls (handles React StrictMode double-invocation)
    if (loadingRef.current) return;

    let cancelled = false;
    loadingRef.current = true;

    (async () => {
      try {
        // Check if logged in; if not, still allow viewing but don't create app
        const { data: auth } = await supabase.auth.getUser();
        if (cancelled) return;

        if (!auth.user) {
          // User not logged in - allow viewing but no appId
          setLoading(false);
          return;
        }

        // User is logged in - create/get application
        const { data, error } = await supabase.rpc(
          "app_start_or_get_application_v1",
          { p_program_id: programId }
        );

        if (cancelled) return;

        // Handle race condition: if duplicate key error, fetch existing application
        if (error) {
          // Check if it's a duplicate key error (race condition)
          if (
            error.message?.includes("duplicate key") ||
            error.message?.includes("unique constraint")
          ) {
            // Try to fetch the existing application instead
            const { data: existingApp, error: fetchError } = await supabase
              .from("applications")
              .select("id")
              .eq("program_id", programId)
              .eq("user_id", auth.user.id)
              .single();

            if (cancelled) return;

            if (fetchError || !existingApp) {
              throw error; // Re-throw original error if we can't find existing
            }

            setAppId(existingApp.id);
            return;
          }

          throw error;
        }

        if (!data) throw new Error("No application row");
        setAppId(data.id);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message ?? "Failed to start application");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
      loadingRef.current = false;
    };
  }, [programId]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  // Render form even if no appId (user not logged in) - form will show sign-in banner
  return (
    <ApplicationForm
      applicationIdProp={appId || undefined}
      programIdProp={programId}
    />
  );
}
