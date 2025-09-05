import * as React from "react";
import { Link } from "react-router-dom";
import { fetchAdminOrgs } from "../../lib/capabilities";

export default function AdminScopePicker() {
  const [orgs, setOrgs] = React.useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchAdminOrgs()
      .then(setOrgs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Organization Admin
            </h1>
            <p className="text-sm text-gray-500">
              Select an organization you administer.
            </p>
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
          {orgs.map((o) => (
            <Link
              key={o.id}
              to={`/org/${o.slug}/admin`}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900">{o.name}</h3>
              <p className="text-sm text-gray-500">/{o.slug}</p>
            </Link>
          ))}
        </div>

        {!loading && orgs.length === 0 && (
          <div className="p-6 bg-white rounded-lg border text-gray-600">
            No organizations assigned.
          </div>
        )}
      </div>
    </div>
  );
}
