import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { listReviewQueue } from "../../lib/api";

export default function ReviewQueue() {
  const { programId } = useParams<{ programId: string }>();
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listReviewQueue(programId!);
        setItems(data);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load queue");
      } finally {
        setLoading(false);
      }
    })();
  }, [programId]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Review Queue</h1>
      <div className="divide-y rounded-lg border">
        {items.length === 0 && (
          <div className="p-6 text-sm text-gray-500">
            No submitted applications yet.
          </div>
        )}
        {items.map((it) => (
          <Link
            key={it.application_id}
            to={`/review/${programId}/app/${it.application_id}`}
            className="flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex flex-col">
              <span className="font-medium">
                {it.applicant_name ?? "Applicant"}
              </span>
              <span className="text-xs text-gray-500">
                Submitted: {it.submitted_at ?? "—"}
              </span>
            </div>
            <span className="text-xs rounded-full bg-gray-100 px-2 py-1">
              {it.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
