import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import OrgPrograms from "../pages/OrgPrograms";

export default function ProtectedOrgRoute() {
  const { slug } = useParams<{ slug: string }>();
  const [orgExists, setOrgExists] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!slug) {
        if (isMounted) {
          setOrgExists(false);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase.rpc("validate_org_slug", {
          p_slug: slug,
        });

        if (isMounted) {
          // The RPC returns an array with one object that has an 'exists' boolean
          if (error || !data || data.length === 0) {
            setOrgExists(false);
          } else if (data[0] && data[0].is_exists === true) {
            setOrgExists(true);
          } else {
            setOrgExists(false);
          }
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setOrgExists(false);
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Show loading while checking
  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  // Redirect to 404 if organization doesn't exist
  if (orgExists === false) {
    return <Navigate to="*" replace />;
  }

  // Show the actual page only if organization exists
  if (orgExists === true) {
    return <OrgPrograms />;
  }

  // Fallback (shouldn't reach here)
  return <Navigate to="*" replace />;
}
