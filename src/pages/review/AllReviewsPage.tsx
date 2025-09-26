import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useCapabilities } from "../../lib/capabilities";
import { getProgramReviewForm } from "../../lib/api";
import type { ReviewsListRow } from "../../types/reviews";

export default function AllReviewsPage() {
  const [allRows, setAllRows] = useState<ReviewsListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [status, setStatus] = useState<
    "" | "draft" | "submitted" | "not_started"
  >("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [programFormConfigs, setProgramFormConfigs] = useState<
    Record<string, any>
  >({});

  const { reviewerPrograms, loading: capabilitiesLoading } = useCapabilities();

  // Load form configurations for all unique programs
  async function loadProgramFormConfigs(reviews: ReviewsListRow[]) {
    const uniqueProgramIds = [...new Set(reviews.map((r) => r.program_id))];
    const configs: Record<string, any> = {};

    for (const programId of uniqueProgramIds) {
      try {
        const formConfig = await getProgramReviewForm(programId);
        configs[programId] = formConfig;
      } catch (error) {
        console.error(
          `Failed to load form config for program ${programId}:`,
          error
        );
        // Use default config if loading fails
        configs[programId] = {
          show_score: true,
          show_comments: true,
          show_decision: false,
          decision_options: ["accept", "waitlist", "reject"],
        };
      }
    }

    setProgramFormConfigs(configs);
  }

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get existing reviews (commented and finalized)
      const { data: reviewsData, error: reviewsError } = await supabase.rpc(
        "reviews_list_v1",
        {
          p_mine_only: mineOnly,
          p_status: null, // Get all statuses
          p_program_id: null,
          p_org_id: null,
          p_limit: 1000,
          p_offset: 0,
        }
      );

      if (reviewsError) {
        console.error("Error fetching reviews:", reviewsError);
        setError(reviewsError.message);
        setAllRows([]);
        return;
      }

      const existingReviews = (reviewsData ?? []) as ReviewsListRow[];

      // Get all submitted applications directly from the applications table
      const { data: submittedApps, error: appsError } = await supabase
        .from("applications")
        .select(
          `
          id,
          program_id,
          user_id,
          status,
          created_at,
          updated_at,
          programs!inner(name, organization_id, organizations(name))
        `
        )
        .eq("status", "submitted");

      if (appsError) {
        console.error("Error fetching submitted applications:", appsError);
        setError(appsError.message);
        setAllRows([]);
        return;
      }

      console.log("Submitted applications:", submittedApps?.length || 0);
      console.log("Existing reviews:", existingReviews.length);

      // Create a map of existing reviews by application_id
      const reviewsMap = new Map<string, ReviewsListRow>();
      existingReviews.forEach((review) => {
        reviewsMap.set(review.application_id, review);
      });

      // Combine existing reviews with submitted applications that don't have reviews yet
      const combinedRows: ReviewsListRow[] = [...existingReviews];

      // Add submitted applications without reviews as "not_started"
      submittedApps?.forEach((app) => {
        if (!reviewsMap.has(app.id)) {
          // Create a "not_started" review entry
          const notStartedReview: ReviewsListRow = {
            review_id: `not_started_${app.id}`,
            application_id: app.id,
            status: "not_started",
            score: null,
            updated_at: app.updated_at,
            submitted_at: app.created_at,
            comments: null,
            ratings: null,
            reviewer_id: null,
            reviewer_name: "Not assigned",
            applicant_id: app.user_id,
            applicant_name: "—", // Placeholder text instead of UUID
            program_id: app.program_id,
            program_name: (app.programs as any)?.name || "Unknown Program",
            org_id: (app.programs as any)?.organization_id || "",
            org_name:
              (app.programs as any)?.organizations?.name ||
              "Unknown Organization",
          };
          combinedRows.push(notStartedReview);
        }
      });

      console.log("Total combined rows:", combinedRows.length);
      console.log(
        "Not started applications:",
        combinedRows.filter((r) => r.status === "not_started").length
      );

      // Sort all rows by updated_at in descending order (most recent first)
      const sortedRows = combinedRows.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.submitted_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.submitted_at || 0).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      setAllRows(sortedRows);
      // Load form configurations for all programs
      await loadProgramFormConfigs(sortedRows);
    } catch (error) {
      console.error("Error in fetchList:", error);
      setError("Failed to load reviews");
      setAllRows([]);
    }

    setLoading(false);
  }, [mineOnly, status]);

  useEffect(() => {
    fetchList();
  }, [mineOnly, status, fetchList]);

  // Realtime refresh whenever any review changes or program metadata changes
  useEffect(() => {
    const ch = supabase
      .channel("reviews:all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "application_reviews" },
        () => {
          fetchList();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "programs" },
        () => {
          fetchList(); // Refresh when program metadata changes (including form config)
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, fetchList]);

  // Always show decisions column
  const hasAnyDecisionsEnabled = true;

  // Color mapping for decision options
  const getDecisionColor = (decision: string) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      // Standard decisions with specific colors
      accept: { bg: "bg-green-100", text: "text-green-800" },
      waitlist: { bg: "bg-yellow-100", text: "text-yellow-800" },
      reject: { bg: "bg-red-100", text: "text-red-800" },

      // Additional common decisions
      approved: { bg: "bg-emerald-100", text: "text-emerald-800" },
      denied: { bg: "bg-rose-100", text: "text-rose-800" },
      pending: { bg: "bg-blue-100", text: "text-blue-800" },
      "on-hold": { bg: "bg-orange-100", text: "text-orange-800" },
      conditional: { bg: "bg-purple-100", text: "text-purple-800" },
      deferred: { bg: "bg-indigo-100", text: "text-indigo-800" },
      withdrawn: { bg: "bg-gray-100", text: "text-gray-600" },
    };

    // If we have a predefined color, use it
    if (colorMap[decision.toLowerCase()]) {
      return colorMap[decision.toLowerCase()];
    }

    // For custom decisions, generate a consistent color based on the string
    const colors = [
      { bg: "bg-cyan-100", text: "text-cyan-800" },
      { bg: "bg-teal-100", text: "text-teal-800" },
      { bg: "bg-lime-100", text: "text-lime-800" },
      { bg: "bg-amber-100", text: "text-amber-800" },
      { bg: "bg-pink-100", text: "text-pink-800" },
      { bg: "bg-violet-100", text: "text-violet-800" },
      { bg: "bg-sky-100", text: "text-sky-800" },
      { bg: "bg-emerald-100", text: "text-emerald-800" },
      { bg: "bg-rose-100", text: "text-rose-800" },
      { bg: "bg-fuchsia-100", text: "text-fuchsia-800" },
    ];

    // Simple hash function to get consistent color for same decision
    let hash = 0;
    for (let i = 0; i < decision.length; i++) {
      const char = decision.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  // Filter rows based on search term, program selection, and user's assigned programs
  const filteredRows = useMemo(() => {
    let filtered = allRows;

    console.log("Starting with allRows:", allRows.length);
    console.log("Reviewer programs:", reviewerPrograms.length);

    // Filter by assigned programs only
    if (reviewerPrograms.length > 0) {
      const assignedProgramIds = reviewerPrograms.map((p) => p.id);
      console.log("Assigned program IDs:", assignedProgramIds);
      filtered = filtered.filter((row) =>
        assignedProgramIds.includes(row.program_id)
      );
      console.log("After program filter:", filtered.length);
    }

    // Filter by selected program
    if (selectedProgramId) {
      filtered = filtered.filter((row) => row.program_id === selectedProgramId);
    }

    // Filter by status
    if (status) {
      console.log("Filtering by status:", status);
      filtered = filtered.filter((row) => row.status === status);
      console.log("After status filter:", filtered.length);
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

    console.log("Final filtered rows:", filtered.length);
    return filtered;
  }, [allRows, reviewerPrograms, selectedProgramId, searchTerm, status]);

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
              <option value="not_started">not started</option>
              <option value="draft">commented</option>
              <option value="submitted">finalized</option>
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
              <th className="text-left p-2">Decision</th>
              <th className="text-left p-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
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
                        finalized
                      </span>
                    ) : r.status === "not_started" ? (
                      <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">
                        not started
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                        commented
                      </span>
                    )}
                  </td>
                  <td className="p-2">{r.score ?? "—"}</td>
                  <td className="p-2">
                    {programFormConfigs[r.program_id]?.show_decision ? (
                      r.ratings?.decision ? (
                        (() => {
                          const colors = getDecisionColor(r.ratings.decision);
                          return (
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}
                            >
                              {r.ratings.decision}
                            </span>
                          );
                        })()
                      ) : (
                        "—"
                      )
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500">
                        Disabled
                      </span>
                    )}
                  </td>
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
