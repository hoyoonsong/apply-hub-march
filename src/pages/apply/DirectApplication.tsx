import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ApplicationForm from "./ApplicationForm";

export default function DirectApplication() {
  const { programId } = useParams();
  const [appId, setAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Check if logged in; if not, still allow viewing but don't create app
        const { data: auth } = await supabase.auth.getUser();
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
        if (error || !data) throw error || new Error("No application row");
        setAppId(data.id);
      } catch (e: any) {
        setError(e.message ?? "Failed to start application");
      } finally {
        setLoading(false);
      }
    })();
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
