import React from "react";
import { useParams, Link } from "react-router-dom";
import ReviewsTable, {
  ReviewRow,
} from "../../../components/review/ReviewsTable";
import { supabase } from "../../../lib/supabase";

async function fetchOrgIdBySlug(supabase: any, slug: string) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data?.id as string | undefined;
}

export default function OrgReviewsPage() {
  const { slug } = useParams(); // route: /org/:slug/admin/reviews
  const [orgId, setOrgId] = React.useState<string | undefined>();
  const [status, setStatus] = React.useState<"all" | "draft" | "submitted">(
    "all"
  );
  const [rows, setRows] = React.useState<ReviewRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      if (!slug) return;
      const id = await fetchOrgIdBySlug(supabase, slug);
      setOrgId(id);
    })();
  }, [slug]);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("app_list_org_reviews_v1", {
      p_org_id: orgId,
      p_status_filter: status,
    });
    if (error) console.error(error);
    setRows((data ?? []) as ReviewRow[]);
    setLoading(false);
  }

  React.useEffect(() => {
    load();
  }, [orgId, status]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Applications Inbox
              </h1>
              <p className="text-sm text-gray-500">
                Review and manage submitted applications
              </p>
            </div>
            <Link
              to={`/org/${slug}/admin`}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Back to Org Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Filter Section */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/60 rounded-2xl p-6 shadow-lg shadow-indigo-100/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-2 h-6 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full shadow-sm"></div>
            <h2 className="text-lg font-bold text-gray-900">
              Filter Applications
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <label className="block text-sm font-semibold text-gray-800">
              Status
            </label>
            <select
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="all">All Applications</option>
              <option value="draft">Draft Applications</option>
              <option value="submitted">Submitted Applications</option>
            </select>
          </div>
        </div>

        {/* Reviews Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-gradient-to-b from-gray-600 to-gray-700 rounded-full"></div>
              <h2 className="text-xl font-bold text-gray-900">
                Applications ({rows.length})
              </h2>
            </div>
          </div>
          <div className="p-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 px-6 py-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                  <span className="text-gray-600 font-medium">
                    Loading applications...
                  </span>
                </div>
              </div>
            ) : (
              <ReviewsTable rows={rows} variant="org" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
