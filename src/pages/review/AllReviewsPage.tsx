import { useEffect, useState, useMemo, useCallback } from "react";
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

  const { reviewerPrograms } = useCapabilities();

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Reviews</h1>
              <p className="text-gray-600 mt-2">
                Manage and review all applications across your assigned programs
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Reviews Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-gradient-to-b from-gray-600 to-gray-700 rounded-full"></div>
              <h2 className="text-xl font-bold text-gray-900">Reviews</h2>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="px-8 py-6 border-b border-gray-200 bg-white">
            <div className="space-y-4">
              {/* Search Bar */}
              <div>
                <input
                  type="text"
                  placeholder="Search by program name, applicant name, or reviewer..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filter Controls */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={mineOnly}
                    onChange={(e) => setMineOnly(e.target.checked)}
                  />
                  <label className="text-sm font-medium text-gray-700">
                    My reviews only
                  </label>
                </div>

                <div className="h-6 w-px bg-gray-300 hidden md:block" />

                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-800">
                    Status
                  </label>
                  <select
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="">All Statuses</option>
                    <option value="not_started">Not Started</option>
                    <option value="draft">Commented</option>
                    <option value="submitted">Finalized</option>
                  </select>
                </div>

                {reviewerPrograms.length > 0 && (
                  <>
                    <div className="h-6 w-px bg-gray-300 hidden md:block" />
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-gray-800">
                        Program
                      </label>
                      <select
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
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
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-900">
                    Updated
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-900">
                    Program
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-900">
                    Applicant
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-900">
                    Last Edited By
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-900">
                    Review Status
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-900">
                    Score
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-900">
                    Decision
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-900">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                        <span className="text-gray-600 font-medium">
                          Loading reviews...
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <svg
                          className="w-12 h-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <div className="text-gray-600">
                          <p className="font-semibold text-lg">
                            No reviews found
                          </p>
                          <p className="text-sm">
                            {searchTerm || selectedProgramId
                              ? "No reviews match your current filters."
                              : "No reviews have been created yet."}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredRows.map((r) => (
                    <tr
                      key={r.review_id}
                      className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-4 text-gray-700">
                        {r.updated_at
                          ? new Date(r.updated_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="p-4 font-medium text-gray-900">
                        {r.program_name}
                      </td>
                      <td className="p-4 text-gray-700">
                        {r.applicant_name ?? r.applicant_id}
                      </td>
                      <td
                        className="p-4 text-gray-700"
                        title={r.reviewer_id ?? ""}
                      >
                        {r.reviewer_name ?? "Unknown User"}
                      </td>
                      <td className="p-4">
                        {r.status === "submitted" ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                            Finalized
                          </span>
                        ) : r.status === "not_started" ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                            Not Started
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                            Commented
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-700 font-medium">
                        {r.score ?? "—"}
                      </td>
                      <td className="p-4">
                        {programFormConfigs[r.program_id]?.show_decision ? (
                          r.ratings?.decision ? (
                            (() => {
                              const colors = getDecisionColor(
                                r.ratings.decision
                              );
                              return (
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text}`}
                                >
                                  {r.ratings.decision}
                                </span>
                              );
                            })()
                          ) : (
                            "—"
                          )
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <Link
                          to={`/review/app/${r.application_id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Results Count */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span className="font-medium">
                  {loading
                    ? "Loading..."
                    : `Showing ${filteredRows.length} of ${allRows.length} reviews`}
                </span>
              </div>
              {reviewerPrograms.length > 0 && (
                <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Filtered to your assigned programs only
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-red-700 font-medium">Error: {error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
