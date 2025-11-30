import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getApplicationForReview,
  upsertReview,
  getProgramReviewForm,
} from "../../../lib/api";
import AutoLinkText from "../../../components/AutoLinkText";

type ApplicationData = {
  application: {
    id: string;
    program_id: string;
    user_id: string;
    status: string;
    answers: Record<string, any>;
    created_at: string;
    updated_at: string;
  };
  program: {
    id: string;
    name: string;
    metadata: any;
  };
  applicant_profile: {
    full_name: string;
  };
  schema: {
    questions: Array<{
      id: string;
      label: string;
      type: string;
      required?: boolean;
      options?: string[];
    }>;
  };
};

export default function ReviewerApplication() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Review state
  const [score, setScore] = useState<number | null>(null);
  const [comments, setComments] = useState<string>("");
  const [ratings, setRatings] = useState<Record<string, any>>({});
  const [decision, setDecision] = useState<string | null>(null);

  // Reviewer form config
  const [reviewForm, setReviewForm] = useState<{
    show_score: boolean;
    show_comments: boolean;
    show_decision: boolean;
    decision_options: string[];
  }>({
    show_score: true,
    show_comments: true,
    show_decision: false,
    decision_options: ["accept", "waitlist", "reject"],
  });

  // Debug: log form state changes
  useEffect(() => {
    console.log("Review form state changed:", reviewForm);
  }, [reviewForm]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getApplicationForReview(applicationId!);
        if (!data) {
          navigate("/");
          return;
        }
        setApp(data as ApplicationData);
        console.log("Application data loaded:", data);
        console.log("Program ID:", data.program.id);

        // Load reviewer form config
        try {
          console.log(
            "About to call getProgramReviewForm with:",
            data.program.id
          );
          const formConfig = await getProgramReviewForm(data.program.id);
          console.log("Loaded form config:", formConfig);
          setReviewForm({
            show_score: formConfig.show_score ?? true,
            show_comments: formConfig.show_comments ?? true,
            show_decision: formConfig.show_decision ?? false,
            decision_options: formConfig.decision_options ?? [
              "accept",
              "waitlist",
              "reject",
            ],
          });
        } catch (e) {
          console.error("Failed to load reviewer form config:", e);
          // Continue with defaults
        }

        // Initialize review data
        setScore(null);
        setComments("");
        setRatings({});
        setDecision(null);
      } catch (e: any) {
        setError(e.message ?? "Failed to load application");
      } finally {
        setLoading(false);
      }
    })();
  }, [applicationId, navigate]);

  const handleSaveDraft = async () => {
    if (!app) return;
    setSaving(true);
    try {
      await upsertReview({
        applicationId: applicationId!,
        score: reviewForm.show_score ? score : null,
        comments: reviewForm.show_comments ? comments : null,
        ratings,
        status: "draft",
        decision: reviewForm.show_decision ? decision : null,
      });
      alert("Draft saved");
    } catch (e: any) {
      alert(e.message ?? "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!app) return;
    if (
      !window.confirm(
        "Submit review? You won't be able to edit after submission."
      )
    )
      return;

    setSaving(true);
    try {
      await upsertReview({
        applicationId: applicationId!,
        score: reviewForm.show_score ? score : null,
        comments: reviewForm.show_comments ? comments : null,
        ratings,
        status: "submitted",
        decision: reviewForm.show_decision ? decision : null,
      });
      alert("Review submitted!");
      navigate(`/reviewer/programs/${app.application.program_id}/queue`);
    } catch (e: any) {
      alert(e.message ?? "Failed to submit review");
    } finally {
      setSaving(false);
    }
  };

  // Helper function to format dates without timezone issues
  const formatDateValue = (value: any): string => {
    if (!value) return "—";
    const dateStr = String(value);
    // If it's in YYYY-MM-DD format, parse as local date to avoid timezone shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString();
    }
    // Otherwise, try to parse as-is
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    } catch {}
    return String(value);
  };

  const renderAnswer = (question: any, value: any) => {
    if (value == null || value === "")
      return <span className="text-gray-400">—</span>;
    switch (question.type) {
      case "FILE":
        // If it's a boolean, return "--"
        if (typeof value === "boolean") {
          return <span className="text-gray-400">—</span>;
        }
        // Check if this is a file field with metadata
        if (typeof value === "string") {
          // If empty string, return "--"
          if (value.trim() === "") {
            return <span className="text-gray-400">—</span>;
          }
          try {
            const fileInfo = JSON.parse(value);
            if (fileInfo && fileInfo.fileName) {
              return (
                <div className="text-sm text-gray-600">
                  <div className="font-medium">📎 {fileInfo.fileName}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {(fileInfo.fileSize / (1024 * 1024)).toFixed(2)} MB •{" "}
                    {fileInfo.contentType}
                  </div>
                </div>
              );
            }
          } catch {
            // Not JSON, treat as regular text
          }
        }
        // If it's an object, check for file properties
        if (typeof value === "object" && value !== null) {
          if (value.fileName) {
            return (
              <div className="text-sm text-gray-600">
                <div className="font-medium">📎 {value.fileName}</div>
                {value.fileSize && (
                  <div className="text-xs text-gray-500 mt-1">
                    {(value.fileSize / (1024 * 1024)).toFixed(2)} MB
                    {value.contentType && ` • ${value.contentType}`}
                  </div>
                )}
              </div>
            );
          }
        }

        // No valid file found, return "--"
        return <span className="text-gray-400">—</span>;
      case "CHECKBOX":
        return value ? "Yes" : "No";
      case "SELECT":
        return value;
      case "DATE":
        return formatDateValue(value);
      default:
        // For text fields, use AutoLinkText to detect URLs
        const textValue = String(value);
        return <AutoLinkText text={textValue} preserveWhitespace={true} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">
            Error: {error ?? "Application not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Review Application
            </h1>
            <p className="text-sm text-gray-500">
              {app.program.name} — {app.applicant_profile.full_name}
            </p>
          </div>
          <Link
            to={`/reviewer/programs/${app.application.program_id}/queue`}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            Back to Queue
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Applicant Answers */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Applicant Answers</h2>
              <div className="space-y-4">
                {app.schema.questions.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    No custom questions.
                  </div>
                ) : (
                  app.schema.questions.map((question) => (
                    <div
                      key={question.id}
                      className="border-b pb-4 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        <AutoLinkText text={question.label} />
                        {question.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700">
                        {renderAnswer(
                          question,
                          app.application.answers[question.id]
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Review Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Score */}
              {reviewForm.show_score && (
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-sm font-semibold mb-3">Score</h3>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">
                      Score (0-100)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={score ?? ""}
                      onChange={(e) => setScore(Number(e.target.value))}
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Per-question ratings */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3">Question Ratings</h3>
                <div className="space-y-3">
                  {app.schema.questions.map((question) => (
                    <div key={question.id}>
                      <label className="text-xs text-gray-600">
                        <AutoLinkText text={question.label} />
                      </label>
                      <textarea
                        className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        rows={2}
                        value={ratings[question.id] || ""}
                        onChange={(e) =>
                          setRatings({
                            ...ratings,
                            [question.id]: e.target.value,
                          })
                        }
                        placeholder="Notes for this question..."
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments */}
              {reviewForm.show_comments && (
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-sm font-semibold mb-3">Comments</h3>
                  <textarea
                    className="w-full rounded border px-3 py-2 text-sm"
                    rows={4}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="General feedback..."
                  />
                </div>
              )}

              {/* Decision */}
              {reviewForm.show_decision && (
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-sm font-semibold mb-3">Decision</h3>
                  <select
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={decision ?? ""}
                    onChange={(e) => setDecision(e.target.value || null)}
                  >
                    <option value="">Select a decision...</option>
                    {reviewForm.decision_options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={saving}
                  className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
