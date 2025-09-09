import React from "react";
import { useParams } from "react-router-dom";
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
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Applications Inbox</h1>
        <select
          className="border rounded px-2 py-1"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
        </select>
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <ReviewsTable rows={rows} variant="org" />
      )}
    </div>
  );
}
