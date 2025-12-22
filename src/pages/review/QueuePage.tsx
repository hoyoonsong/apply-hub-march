import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ReviewsListRow } from "../../types/reviews";
import { getProgramReviewForm } from "../../lib/api";
import {
  deduplicateRequest,
  createRpcKey,
} from "../../lib/requestDeduplication";

export default function ReviewQueuePage() {
  const { programId } = useParams<{ programId: string }>();
  const [allRows, setAllRows] = useState<ReviewsListRow[]>([]);
  const [programName, setProgramName] = useState<string>("Program");
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [programFormConfig, setProgramFormConfig] = useState<any>(null);

  const fetchList = useCallback(async () => {
    if (!programId) return;

    setLoading(true);
    setErr(null);

    try {
      // Parallelize program name, org slug, and form config queries
      const [programResult, formConfigResult] = await Promise.allSettled([
        supabase
          .from("programs")
          .select("name, organization_id, organizations(slug)")
          .eq("id", programId)
          .single(),
        getProgramReviewForm(programId).catch(() => null),
      ]);

      // Handle program name and org slug result
      if (
        programResult.status === "fulfilled" &&
        !programResult.value.error &&
        programResult.value.data
      ) {
        if (programResult.value.data.name) {
          setProgramName(programResult.value.data.name);
        }
        const org = (programResult.value.data as any).organizations;
        if (org?.slug) {
          setOrgSlug(org.slug);
        }
      }

      // Handle form config result
      if (formConfigResult.status === "fulfilled" && formConfigResult.value) {
        setProgramFormConfig(formConfigResult.value);
      } else {
        // Use default config if loading fails
        setProgramFormConfig({
          show_score: true,
          show_comments: true,
          show_decision: false,
          decision_options: ["accept", "waitlist", "reject"],
        });
      }

      // Parallelize reviews and applications queries
      // Use deduplication to prevent duplicate calls from React StrictMode
      const [reviewsResult, appsResult] = await Promise.allSettled([
        deduplicateRequest(
          createRpcKey("reviews_list_v1", {
            p_mine_only: false,
            p_status: null,
            p_program_id: programId,
            p_org_id: null,
            p_limit: 1000,
            p_offset: 0,
          }),
          async () => {
            const result = await supabase.rpc("reviews_list_v1", {
              p_mine_only: false,
              p_status: null,
              p_program_id: programId,
              p_org_id: null,
              p_limit: 1000,
              p_offset: 0,
            });
            return result;
          }
        ),
        supabase
          .from("applications")
          .select(
            `
            id,
            program_id,
            user_id,
            status,
            created_at,
            updated_at,
            submitted_at,
            programs!inner(name, organization_id, organizations(name))
          `
          )
          .eq("status", "submitted")
          .eq("program_id", programId),
      ]);

      // Handle reviews result
      if (reviewsResult.status === "rejected") {
        console.error("Error fetching reviews:", reviewsResult.reason);
        setErr("Failed to load reviews");
        setAllRows([]);
        setLoading(false);
        return;
      }

      const reviewsResponse = reviewsResult.value as { data: any; error: any };
      const reviewsError = reviewsResponse?.error;
      if (reviewsError) {
        console.error("Error fetching reviews:", reviewsError);
        setErr(reviewsError.message);
        setAllRows([]);
        setLoading(false);
        return;
      }

      const existingReviewsRaw = (reviewsResponse?.data ??
        []) as ReviewsListRow[];

      // Handle applications result
      // Note: This query may fail for reviewers due to RLS, which is OK
      // We'll just use what we got from reviews_list_v1
      let submittedApps: any[] = [];
      if (appsResult.status === "fulfilled" && !appsResult.value.error) {
        submittedApps = appsResult.value.data || [];
      } else if (appsResult.status === "rejected") {
        console.warn(
          "Could not fetch applications (likely RLS restriction):",
          appsResult.reason
        );
      } else if (appsResult.value?.error) {
        console.warn(
          "Could not fetch applications (likely RLS restriction):",
          appsResult.value.error.message
        );
      }

      // Map of application_id -> application submitted time (app-level)
      const appSubmittedMap = new Map<string, string | null>();
      submittedApps?.forEach((app: any) => {
        appSubmittedMap.set(
          app.id,
          app.submitted_at || app.updated_at || app.created_at
        );
      });

      // Normalize submitted_at on existing review rows to mean
      // "when the application was submitted", not "when the review was saved".
      const existingReviews: ReviewsListRow[] = existingReviewsRaw.map(
        (review) => {
          const appSubmitted =
            appSubmittedMap.get(review.application_id) || null;
          return {
            ...review,
            submitted_at:
              appSubmitted ?? review.submitted_at ?? review.updated_at ?? null,
          };
        }
      );

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
            submitted_at: app.submitted_at || app.updated_at || app.created_at,
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

      // Sort all rows by submitted_at in descending order (most recent first)
      const sortedRows = combinedRows.sort((a, b) => {
        const dateA = new Date(a.submitted_at || a.updated_at || 0).getTime();
        const dateB = new Date(b.submitted_at || b.updated_at || 0).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      setAllRows(sortedRows);
    } catch (error) {
      console.error("Error in fetchList:", error);
      setErr("Failed to load reviews");
      setAllRows([]);
    }

    setLoading(false);
  }, [programId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

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

  if (!programId) return <div>Missing programId</div>;
  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Review Queue - {programName}</h1>
        {orgSlug && programId && (
          <Link
            to={`/org/${orgSlug}/admin/programs/${programId}/publish`}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Publish Results
          </Link>
        )}
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        {allRows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No submitted applications yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Edited By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Review Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Decision
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allRows.map((row) => (
                  <tr key={row.review_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.submitted_at
                        ? new Date(row.submitted_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.applicant_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.reviewer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          row.status === "submitted"
                            ? "bg-green-100 text-green-800"
                            : row.status === "draft"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {row.status === "submitted"
                          ? "finalized"
                          : row.status === "draft"
                          ? "commented"
                          : "not started"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.score || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {programFormConfig?.show_decision ? (
                        row.ratings?.decision ? (
                          (() => {
                            const colors = getDecisionColor(
                              row.ratings.decision
                            );
                            return (
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}
                              >
                                {row.ratings.decision}
                              </span>
                            );
                          })()
                        ) : (
                          "—"
                        )
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/review/app/${row.application_id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Showing {allRows.length} applications
      </div>
    </div>
  );
}
