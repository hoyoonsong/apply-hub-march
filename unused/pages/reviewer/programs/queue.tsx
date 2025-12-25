import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { listReviewQueue } from "../../../../lib/api";

type ReviewQueueItem = {
  application_id: string;
  applicant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export default function ReviewerQueue() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("submitted");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listReviewQueue(programId!, statusFilter);
        setItems(data || []);
      } catch (e: any) {
        setError(e.message ?? "Failed to load queue");
      } finally {
        setLoading(false);
      }
    })();
  }, [programId, statusFilter, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Review Queue
            </h1>
            <p className="text-sm text-gray-500">
              Applications waiting for review
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border px-2 py-1 text-sm"
            >
              <option value="submitted">Submitted</option>
              <option value="">All statuses</option>
            </select>
            <Link
              to="/reviewer"
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Back to Programs
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                  Applicant
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                  Submitted
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {items.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-sm text-gray-500"
                    colSpan={4}
                  >
                    No applications match this filter.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.application_id}>
                    <td className="px-4 py-2 text-sm">
                      <span className="font-medium">{item.applicant_id}</span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        to={`/reviewer/applications/${item.application_id}`}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
