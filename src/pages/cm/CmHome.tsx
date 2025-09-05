import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useScope } from "../../auth/ScopeProvider";

type Coalition = { id: string; name: string; slug: string };

export default function CmHome() {
  const [cos, setCos] = useState<Coalition[]>([]);
  const [loading, setLoading] = useState(true);
  const { setScope } = useScope();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("my_coalitions_v1");
      if (!error) setCos(data ?? []);
      setLoading(false);
    })();
  }, []);

  const onPick = (c: Coalition) => {
    setScope({ kind: "coalition", id: c.id, slug: c.slug, name: c.name });
    navigate(`/coalition/${c.slug}/cm`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Coalition Manager
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Select a coalition to manage.
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
            {cos.map((c) => (
              <button
                key={c.id}
                onClick={() => onPick(c)}
                className="bg-white border rounded-xl p-5 text-left hover:shadow-sm transition-all hover:border-gray-300"
              >
                <div className="text-lg font-semibold text-gray-900">
                  {c.name}
                </div>
                <div className="text-gray-500 text-sm mt-1">/{c.slug}</div>
              </button>
            ))}
            {cos.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-8">
                No coalitions assigned.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
