import { useEffect, useState } from "react";
import {
  listFormSubmissions,
  updateFormSubmission,
  type FormSubmission,
  type FormSubmissionStatus,
} from "../../services/forms";

export default function Forms() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<FormSubmissionStatus | "all">("all");
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const allSubmissions = await listFormSubmissions();
      setSubmissions(allSubmissions);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load form submissions"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const handleMarkDone = async (id: string) => {
    try {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      await updateFormSubmission(id, {
        status: "approved",
        notes: notes.trim() || null,
      });

      setSuccess("Submission marked as done");
      setNotes("");
      setSelectedSubmission(null);
      await loadSubmissions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update submission"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleFlag = async (id: string) => {
    try {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      const flagNote = notes.trim() 
        ? `FLAGGED: ${notes.trim()}` 
        : "FLAGGED";

      await updateFormSubmission(id, {
        status: "pending",
        notes: flagNote,
      });

      setSuccess("Submission flagged");
      setNotes("");
      setSelectedSubmission(null);
      await loadSubmissions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update submission"
      );
    } finally {
      setProcessing(false);
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    if (filterType !== "all" && submission.form_type !== filterType) {
      return false;
    }
    if (filterStatus !== "all" && submission.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const formTypes = Array.from(new Set(submissions.map((s) => s.form_type)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Omnipply Forms</h1>
              <p className="mt-1 text-sm text-gray-500">
                Review and manage form submissions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Form Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">All Types</option>
                {formTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as FormSubmissionStatus | "all")
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-800">
            {success}
          </div>
        )}

        {/* Submissions List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No form submissions found.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {submission.form_type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            submission.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : submission.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : submission.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {submission.status}
                        </span>
                      </div>

                      {/* Display form data based on type */}
                      {submission.form_type === "organization_signup" && (
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <span className="font-medium">Name:</span>{" "}
                            {submission.form_data.name}
                          </p>
                          {submission.form_data.description && (
                            <p>
                              <span className="font-medium">Description:</span>{" "}
                              {submission.form_data.description}
                            </p>
                          )}
                          {submission.form_data.contact_email && (
                            <p>
                              <span className="font-medium">Contact Email:</span>{" "}
                              <a
                                href={`mailto:${submission.form_data.contact_email}`}
                                className="text-blue-600 hover:underline"
                              >
                                {submission.form_data.contact_email}
                              </a>
                            </p>
                          )}
                          {submission.form_data.contact_phone && (
                            <p>
                              <span className="font-medium">Contact Phone:</span>{" "}
                              <a
                                href={`tel:${submission.form_data.contact_phone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {submission.form_data.contact_phone}
                              </a>
                            </p>
                          )}
                          {submission.form_data.website && (
                            <p>
                              <span className="font-medium">Website:</span>{" "}
                              <a
                                href={submission.form_data.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {submission.form_data.website}
                              </a>
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-2 text-xs text-gray-500">
                        Submitted: {new Date(submission.created_at).toLocaleString()}
                        {submission.reviewed_at && (
                          <span className="ml-4">
                            Reviewed: {new Date(submission.reviewed_at).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {submission.notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                          <span className="font-medium">Notes:</span> {submission.notes}
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex gap-2">
                      {submission.status === "pending" && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setNotes("");
                            }}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            Review
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setSelectedSubmission(null);
                setNotes("");
              }}
              className="absolute right-3 top-3 rounded p-1 text-gray-400 hover:bg-gray-100"
            >
              ✕
            </button>

            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              Review Submission
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Form Type
                </label>
                <p className="text-gray-900">
                  {selectedSubmission.form_type
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Form Data
                </label>
                <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(selectedSubmission.form_data, null, 2)}
                </pre>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Add notes about this submission..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedSubmission(null);
                  setNotes("");
                }}
                disabled={processing}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleFlag(selectedSubmission.id)}
                disabled={processing}
                className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
              >
                {processing ? "Processing..." : "Flag"}
              </button>
              <button
                onClick={() => handleMarkDone(selectedSubmission.id)}
                disabled={processing}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {processing ? "Processing..." : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

