import { useEffect, useState } from "react";
import { listReviewQueue } from "../../lib/reviewApi";
import { Link, useParams } from "react-router-dom";

export default function ReviewQueuePage() {
  const { programId } = useParams<{ programId: string }>();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "draft" | "submitted" | null
  >(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!programId) return;
      setLoading(true);
      setErr(null);
      try {
        const data = await listReviewQueue(programId, statusFilter);
        if (!cancelled) setRows(data);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load queue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [programId, statusFilter]);

  if (!programId) return <div>Missing programId</div>;
  if (loading) return <div>Loading…</div>;
  if (err) return <div className="text-red-600">{err}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Review Queue</h1>
        <select
          value={statusFilter ?? ""}
          onChange={(e) => setStatusFilter((e.target.value as any) || null)}
          className="border rounded px-2 py-1"
        >
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div>No applications to review.</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r: any) => (
            <li
              key={r.application_id ?? r.id}
              className="border rounded p-3 flex items-center justify-between"
            >
              <div className="text-sm">
                <div className="font-medium">Application</div>
                <div className="text-gray-600">
                  {r.application_id ?? r.id} · {r.status ?? "—"}
                </div>
                {r.submitted_at && (
                  <div className="text-xs text-gray-400">
                    {new Date(r.submitted_at).toLocaleString()}
                  </div>
                )}
                {r.my_review_status && (
                  <div className="text-xs">
                    My status: {r.my_review_status}{" "}
                    {r.my_score != null ? `(${r.my_score})` : ""}
                  </div>
                )}
              </div>
              <Link
                className="text-blue-600 underline"
                to={`/review/app/${r.application_id ?? r.id}`}
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
