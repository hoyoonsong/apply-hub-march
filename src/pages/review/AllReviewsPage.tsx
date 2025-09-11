import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { ReviewsListRow } from "../../types/reviews";

export default function AllReviewsPage() {
  const [rows, setRows] = useState<ReviewsListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [status, setStatus] = useState<"" | "draft" | "submitted">("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  async function fetchList() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc("reviews_list_v1", {
      p_mine_only: mineOnly,
      p_status: status || null,
      p_program_id: null,
      p_org_id: null,
      p_limit: pageSize,
      p_offset: page * pageSize,
    });

    if (error) {
      console.error("Error fetching reviews:", error);
      setError(error.message);
      setRows([]);
    } else {
      const reviews = (data ?? []) as ReviewsListRow[];
      setRows(reviews);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchList();
  }, [mineOnly, status, page]); // eslint-disable-line

  // Realtime refresh whenever any review changes (no heavy logic here)
  useEffect(() => {
    const ch = supabase
      .channel("reviews:all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "application_reviews" },
        () => fetchList()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [supabase]); // eslint-disable-line

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">All Reviews</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={mineOnly}
            onChange={(e) => {
              setPage(0);
              setMineOnly(e.target.checked);
            }}
          />
          <span className="text-sm">My reviews only</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <span className="text-sm">Status</span>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={status}
            onChange={(e) => {
              setPage(0);
              setStatus(e.target.value as any);
            }}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
          </select>
        </label>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Updated</th>
              <th className="text-left p-2">Program</th>
              <th className="text-left p-2">Applicant</th>
              <th className="text-left p-2">Last Edited By</th>
              <th className="text-left p-2">Review Status</th>
              <th className="text-left p-2">Score</th>
              <th className="text-left p-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  No reviews yet.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.review_id} className="border-t">
                  <td className="p-2">
                    {r.updated_at
                      ? new Date(r.updated_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-2">{r.program_name}</td>
                  <td className="p-2">{r.applicant_name ?? r.applicant_id}</td>
                  <td className="p-2" title={r.reviewer_id ?? ""}>
                    {r.reviewer_name ?? "Unknown User"}
                  </td>
                  <td className="p-2">
                    {r.status === "submitted" ? (
                      <span className="px-2 py-1 rounded bg-green-100 text-green-800">
                        Submitted
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="p-2">{r.score ?? "—"}</td>
                  <td className="p-2 text-right">
                    <Link
                      to={`/review/app/${r.application_id}`}
                      className="rounded px-3 py-1 bg-blue-600 text-white"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button
          className="rounded px-3 py-1 border"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </button>
        <div className="text-sm text-gray-500">Page {page + 1}</div>
        <button
          className="rounded px-3 py-1 border"
          disabled={rows.length < pageSize}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      {error && <div className="text-sm text-red-600">Error: {error}</div>}
    </div>
  );
}
