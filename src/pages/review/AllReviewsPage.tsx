import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useCapabilities } from "../../lib/capabilities";
import type { ReviewsListRow } from "../../types/reviews";

export default function AllReviewsPage() {
  const [allRows, setAllRows] = useState<ReviewsListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [status, setStatus] = useState<"" | "draft" | "submitted">("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  const { reviewerPrograms, loading: capabilitiesLoading } = useCapabilities();

  async function fetchList() {
    setLoading(true);
    setError(null);

    // Get all reviews (no pagination, no program filter at RPC level)
    const { data, error } = await supabase.rpc("reviews_list_v1", {
      p_mine_only: mineOnly,
      p_status: status || null,
      p_program_id: null,
      p_org_id: null,
      p_limit: 1000, // Large limit to get all reviews
      p_offset: 0,
    });

    if (error) {
      console.error("Error fetching reviews:", error);
      setError(error.message);
      setAllRows([]);
    } else {
      const reviews = (data ?? []) as ReviewsListRow[];
      setAllRows(reviews);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchList();
  }, [mineOnly, status]); // eslint-disable-line

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

  // Filter rows based on search term, program selection, and user's assigned programs
  const filteredRows = useMemo(() => {
    let filtered = allRows;

    // Filter by assigned programs only
    if (reviewerPrograms.length > 0) {
      const assignedProgramIds = reviewerPrograms.map((p) => p.id);
      filtered = filtered.filter((row) =>
        assignedProgramIds.includes(row.program_id)
      );
    }

    // Filter by selected program
    if (selectedProgramId) {
      filtered = filtered.filter((row) => row.program_id === selectedProgramId);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.program_name.toLowerCase().includes(term) ||
          (row.applicant_name &&
            row.applicant_name.toLowerCase().includes(term)) ||
          (row.applicant_id && row.applicant_id.toLowerCase().includes(term)) ||
          (row.reviewer_name && row.reviewer_name.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [allRows, reviewerPrograms, selectedProgramId, searchTerm]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">All Reviews</h1>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by program name, applicant name, or reviewer..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Other Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
            />
            <span className="text-sm">My reviews only</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <span className="text-sm">Status</span>
            <select
              className="rounded border px-2 py-1 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
            </select>
          </label>
          {reviewerPrograms.length > 0 && (
            <label className="inline-flex items-center gap-2">
              <span className="text-sm">Program</span>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
              >
                <option value="">All Programs</option>
                {reviewerPrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
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
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  {searchTerm || selectedProgramId
                    ? "No reviews match your filters."
                    : "No reviews yet."}
                </td>
              </tr>
            )}
            {!loading &&
              filteredRows.map((r) => (
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

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          {loading
            ? "Loading..."
            : `Showing ${filteredRows.length} of ${allRows.length} reviews`}
        </div>
        {reviewerPrograms.length > 0 && (
          <div className="text-xs">Filtered to your assigned programs only</div>
        )}
      </div>

      {error && <div className="text-sm text-red-600">Error: {error}</div>}
    </div>
  );
}
