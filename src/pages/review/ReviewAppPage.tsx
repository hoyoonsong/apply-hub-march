import React from "react";
import { useParams } from "react-router-dom";
import { useCollaborativeReview } from "../../hooks/useCollaborativeReview";
import AnswersViewer from "../../components/review/AnswersViewer";

export default function ReviewAppPage() {
  const { applicationId } = useParams<{ applicationId: string }>();

  if (!applicationId) {
    return <div className="p-6">Missing application ID</div>;
  }

  const {
    answers,
    review,
    applicationSchema,
    reviewFormConfig,
    program,
    loading,
    saving,
    error,
    saveDraft,
    submit,
    setScore,
    setComments,
    setRatingsJSON,
    setDecision,
    getRatingsJSON,
  } = useCollaborativeReview(applicationId);

  // Color mapping for decision options (same as AllReviewsPage)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="text-2xl font-semibold mb-1">Review Application</div>
          <div className="text-sm text-gray-500">
            Status:{" "}
            <span className="font-medium">
              {review.status ?? "not-started"}
            </span>
          </div>
        </div>

        {/* Main Content - Side by Side */}
        <div className="flex gap-6">
          {/* Left Side - Applicant Responses */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-lg font-semibold mb-4">
                Applicant Responses
              </div>
              <AnswersViewer
                applicationSchema={applicationSchema}
                answers={answers}
                program={program}
              />
            </div>
          </div>

          {/* Right Side - Review Form Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <div className="text-lg font-semibold mb-4">
                Review (Collaborative)
              </div>

              {/* Last edited info (name + time) */}
              <div className="text-xs text-gray-500 mb-3">
                {(() => {
                  const name = (review as any)?.reviewer_name || "Loading...";
                  const when = review?.updated_at
                    ? new Date(review.updated_at as any).toLocaleString()
                    : null;

                  return (
                    <>
                      Last edited by {name}
                      {when ? ` · ${when}` : ""}
                    </>
                  );
                })()}
              </div>

              <div className="space-y-4">
                {reviewFormConfig.show_score && (
                  <label className="block text-sm">
                    <span className="block mb-2 font-medium">Score</span>
                    <input
                      type="number"
                      className={`border rounded px-3 py-2 w-full ${
                        review.status === "submitted"
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }`}
                      value={review.score ?? ""}
                      onChange={(e) =>
                        setScore(
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                      placeholder="Enter score"
                      disabled={review.status === "submitted"}
                    />
                  </label>
                )}

                {reviewFormConfig.show_comments && (
                  <label className="block text-sm">
                    <span className="block mb-2 font-medium">Comments</span>
                    <textarea
                      className={`border rounded px-3 py-2 w-full h-32 resize-none ${
                        review.status === "submitted"
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }`}
                      value={review.comments ?? ""}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Add your review comments..."
                      disabled={review.status === "submitted"}
                    />
                  </label>
                )}

                {reviewFormConfig.show_decision && (
                  <label className="block text-sm">
                    <span className="block mb-2 font-medium">Decision</span>
                    <select
                      className={`border rounded px-3 py-2 w-full ${
                        review.status === "submitted"
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }`}
                      value={(review as any).decision ?? ""}
                      onChange={(e) => setDecision(e.target.value || null)}
                      disabled={review.status === "submitted"}
                    >
                      <option value="">Select a decision...</option>
                      {reviewFormConfig.decision_options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="pt-4 border-t border-gray-200">
                  {review.status === "submitted" ? (
                    // Submitted state
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-sm font-medium text-green-600 mb-1">
                          ✓ Review Submitted
                        </div>
                        {review.submitted_at && (
                          <div className="text-xs text-gray-500 mb-2">
                            {new Date(review.submitted_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Draft state - show save and submit buttons
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <button
                          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                          onClick={() =>
                            saveDraft({
                              score: review.score,
                              comments: review.comments,
                              decision: (review as any).decision,
                            })
                          }
                          disabled={saving === "saving"}
                        >
                          {saving === "saving" ? "Saving..." : "Save Draft"}
                        </button>
                        <button
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          onClick={() =>
                            submit({
                              score: review.score,
                              comments: review.comments,
                              decision: (review as any).decision,
                            })
                          }
                          disabled={saving === "saving"}
                        >
                          Submit Review
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 text-center">
                    {saving === "saving" && (
                      <span className="text-xs text-gray-500">Saving…</span>
                    )}
                    {saving === "saved" && review.status !== "submitted" && (
                      <span className="text-xs text-green-600">✓ Saved</span>
                    )}
                    {saving === "error" && (
                      <span className="text-xs text-red-600">✗ Save error</span>
                    )}
                    {saving === "idle" && review.status !== "submitted" && (
                      <span className="text-xs text-gray-400">
                        Click "Save Draft" to save
                      </span>
                    )}
                    {error && (
                      <div className="text-xs text-red-600 mt-1">{error}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
