import * as React from "react";
import { Link } from "react-router-dom";
import { fetchCoalitions } from "../../lib/capabilities";

export default function CoalitionScopePicker() {
  const [cos, setCos] = React.useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchCoalitions()
      .then(setCos)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Coalition Manager
            </h1>
            <p className="text-sm text-gray-500">Manage your coalition(s).</p>
          </div>
          <Link
            to="/"
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Back to Hub
          </Link>
        </div>

        {loading && (
          <div className="p-6 bg-white rounded-lg border">Loading…</div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cos.map((c) => (
            <Link
              key={c.id}
              to={`/coalition/${c.slug}/cm`}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900">{c.name}</h3>
              <p className="text-sm text-gray-500">/{c.slug}</p>
            </Link>
          ))}
        </div>

        {!loading && cos.length === 0 && (
          <div className="p-6 bg-white rounded-lg border text-gray-600">
            No coalition manager assignments.
          </div>
        )}
      </div>
    </div>
  );
}
