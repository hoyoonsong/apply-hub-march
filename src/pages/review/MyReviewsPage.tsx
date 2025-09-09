import React from "react";
import ReviewsTable, { ReviewRow } from "../../components/review/ReviewsTable";
import { supabase } from "../../lib/supabase";

export default function MyReviewsPage() {
  const [rows, setRows] = React.useState<ReviewRow[]>([]);
  const [status, setStatus] = React.useState<"all" | "draft" | "submitted">(
    "all"
  );
  const [loading, setLoading] = React.useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("app_list_my_reviews_v1", {
      p_status_filter: status,
    });
    if (error) console.error(error);
    setRows((data ?? []) as ReviewRow[]);
    setLoading(false);
  }

  React.useEffect(() => {
    load();
  }, [status]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">My Reviews</h1>
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
        <ReviewsTable rows={rows} variant="my" />
      )}
    </div>
  );
}
