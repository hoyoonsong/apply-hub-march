import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { listReviewQueue } from "../../lib/api";
import { supabase } from "../../lib/supabase";

export default function ReviewerInboxPage() {
  const { programId } = useParams<{ programId: string }>();
  const [rows, setRows] = useState<ReviewerListItem[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | "">("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [programName, setProgramName] = useState<string>("Program");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        // Try to fetch program name (if reviewer has policy to read it)
        const { data: p, error: pErr } = await supabase
          .from("programs")
          .select("id,name")
          .eq("id", programId)
          .limit(1)
          .maybeSingle();
        if (!pErr && p?.name) setProgramName(p.name);

        const data = await listReviewerApplications(
          programId!,
          statusFilter || undefined
        );
        if (active) setRows(data);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [programId, statusFilter]);

  const sorted = useMemo(
    () =>
      (rows ?? [])
        .slice()
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [rows]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reviews — {programName}</h1>
          <p className="text-sm text-gray-500">
            Applications you can review for this program.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="reviewing">Reviewing</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="waitlisted">Waitlisted</option>
          </select>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {err && <div className="text-sm text-red-600">Error: {err}</div>}

      {!loading && !err && (
        <div className="overflow-hidden rounded-xl border">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                  Applicant
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                  App Status
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                  Your Review
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {sorted.map((r) => (
                <tr key={r.application_id}>
                  <td className="px-4 py-2 text-sm">
                    {/* You may not have profile RLS — show masked id in worst case */}
                    <span className="font-medium">
                      {r.applicant_id.slice(0, 4)}…{r.applicant_id.slice(-4)}
                    </span>
                    <div className="text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize">
                      {r.application_status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {r.my_review_status === "none" ? (
                      <span className="text-gray-400">Not started</span>
                    ) : (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs">
                        {r.my_review_status}{" "}
                        {r.my_score != null && `• ${r.my_score}`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      to={`/review/app/${r.application_id}`}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-sm text-gray-500"
                    colSpan={4}
                  >
                    No applications match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
