import { Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProtectedReviewerRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { slug } = useParams();
  const [ok, setOk] = useState<null | boolean>(null);

  useEffect(() => {
    (async () => {
      const [orgs, programs] = await Promise.all([
        supabase.rpc("my_reviewer_orgs_v1"),
        supabase.rpc("my_reviewer_programs_v1"),
      ]);

      if (orgs.error || programs.error) return setOk(false);

      const orgAllowed = (orgs.data ?? []).some((o: any) => o.slug === slug);
      const programAllowed = (programs.data ?? []).some(
        (p: any) => p.organization_slug === slug
      );

      setOk(orgAllowed || programAllowed);
    })();
  }, [slug]);

  if (ok === null)
    return <div className="p-6 text-gray-500">Checking access…</div>;
  if (!ok) return <Navigate to="/unauthorized" replace />;
  return children;
}
