import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useScope } from "../../auth/ScopeProvider";

type Org = { id: string; name: string; slug: string };

export default function AdminHome() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { setScope } = useScope();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("my_admin_orgs_v1");
      if (!error) setOrgs(data ?? []);
      setLoading(false);
    })();
  }, []);

  const onPick = (o: Org) => {
    setScope({ kind: "org", id: o.id, slug: o.slug, name: o.name });
    navigate(`/org/${o.slug}/admin`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Organization Admin
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Select an organization you administer.
              </p>
            </div>
            <Link
              to="/hub"
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg text-center"
            >
              Back to Hub
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {loading ? (
          <div className="mt-8 text-gray-500">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgs.map((o) => (
              <button
                key={o.id}
                onClick={() => onPick(o)}
                className="bg-white border rounded-xl p-5 text-left hover:shadow-sm transition-all hover:border-gray-300"
              >
                <div className="text-lg font-semibold text-gray-900">
                  {o.name}
                </div>
                <div className="text-gray-500 text-sm mt-1">/{o.slug}</div>
              </button>
            ))}
            {orgs.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-8">
                No organizations assigned.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
