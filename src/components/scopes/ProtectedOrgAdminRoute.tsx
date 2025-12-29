import { Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { deduplicateRequest, createRpcKey } from "../../lib/requestDeduplication";
import { OrgAdminModalProvider } from "../../contexts/OrgAdminModalContext";

export default function ProtectedOrgAdminRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { orgSlug } = useParams();
  const [ok, setOk] = useState<null | boolean>(null);

  useEffect(() => {
    (async () => {
      // Use deduplication to prevent duplicate calls from React StrictMode
      const { data, error } = await deduplicateRequest(
        createRpcKey("my_admin_orgs_v1"),
        () => supabase.rpc("my_admin_orgs_v1")
      );
      if (error) return setOk(false);
      const allowed = (data ?? []).some((o: any) => o.slug === orgSlug);
      setOk(allowed);
    })();
  }, [orgSlug]);

  if (ok === null)
    return <div className="p-6 text-gray-500">Checking access…</div>;
  if (!ok) return <Navigate to="/unauthorized" replace />;
  
  // Wrap children with modal provider so modals are available on all org admin pages
  return <OrgAdminModalProvider>{children}</OrgAdminModalProvider>;
}
