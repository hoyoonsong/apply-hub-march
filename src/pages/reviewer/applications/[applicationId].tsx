import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getApplicationForReview, upsertReview } from "../../../lib/api";

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
  const [score, setScore] = useState<number>(0);
  const [comments, setComments] = useState<string>("");
  const [ratings, setRatings] = useState<Record<string, any>>({});

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

        // Initialize review data
        setScore(0);
        setComments("");
        setRatings({});
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
        score,
        comments,
        ratings,
        status: "draft",
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
        score,
        comments,
        ratings,
        status: "submitted",
      });
      alert("Review submitted!");
      navigate(`/reviewer/programs/${app.application.program_id}/queue`);
    } catch (e: any) {
      alert(e.message ?? "Failed to submit review");
    } finally {
      setSaving(false);
    }
  };

  const renderAnswer = (question: any, value: any) => {
    if (value == null || value === "")
      return <span className="text-gray-400">—</span>;
    switch (question.type) {
      case "FILE":
        return typeof value === "string" ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline"
          >
            View file
          </a>
        ) : (
          JSON.stringify(value)
        );
      case "CHECKBOX":
        return value ? "Yes" : "No";
      case "SELECT":
        return value;
      case "DATE":
        return new Date(value).toLocaleString();
      default:
        return String(value);
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
                        {question.label}
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
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3">Score</h3>
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Score (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Per-question ratings */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3">Question Ratings</h3>
                <div className="space-y-3">
                  {app.schema.questions.map((question) => (
                    <div key={question.id}>
                      <label className="text-xs text-gray-600">
                        {question.label}
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
