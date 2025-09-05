import { Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProtectedCoalitionRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { slug } = useParams();
  const [ok, setOk] = useState<null | boolean>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("my_coalitions_v1");
      if (error) return setOk(false);
      const allowed = (data ?? []).some((c: any) => c.slug === slug);
      setOk(allowed);
    })();
  }, [slug]);

  if (ok === null)
    return <div className="p-6 text-gray-500">Checking access…</div>;
  if (!ok) return <Navigate to="/unauthorized" replace />;
  return children;
}
