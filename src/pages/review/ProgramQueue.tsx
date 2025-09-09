import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function ProgramQueue() {
  const { programId } = useParams();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!programId) return;
        const { data, error } = await supabase.rpc("app_list_review_queue_v1", {
          p_program_id: programId,
          p_status_filter: "submitted",
        });
        if (error) throw error;
        setRows(data || []);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load queue");
      } finally {
        setLoading(false);
      }
    })();
  }, [programId]);

  if (!programId)
    return <div className="p-6 text-red-600">Program not found</div>;
  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Review Queue</h1>
      <div className="rounded-2xl border">
        {rows.length === 0 ? (
          <div className="p-6 text-slate-500">No submitted applications.</div>
        ) : (
          rows.map((r) => (
            <Link
              key={r.application_id}
              to={`/review/applications/${r.application_id}`}
              className="flex items-center justify-between p-4 border-b hover:bg-slate-50"
            >
              <div>
                <div className="font-medium">
                  {r.applicant_name ?? "Unnamed applicant"}
                </div>
                <div className="text-sm text-slate-500">
                  Submitted {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-sm">{r.status}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
