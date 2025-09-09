import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Row = {
  application_id: string;
  applicant_id: string;
  submitted_at: string | null;
  my_review_status: string;
  my_score: number | null;
};

export default function ReviewQueue() {
  const { programId } = useParams();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc("app_list_review_queue_v1", {
        p_program_id: programId,
        p_status_filter: null,
      });
      if (!ignore) {
        if (error) setError(error.message);
        else setRows(data || []);
        setLoading(false);
      }
    }
    if (programId) load();
    return () => {
      ignore = true;
    };
  }, [programId]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="container">
      <h1 className="mb-4">Review Queue</h1>
      <div className="space-y-2">
        {rows?.map((r) => (
          <Link
            key={r.application_id}
            className="block p-3 border rounded hover:bg-gray-50"
            to={`/review/app/${r.application_id}`}
          >
            <div className="text-sm text-gray-500">{r.applicant_id}</div>
            <div className="text-xs text-gray-400">
              {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}
            </div>
            <div className="text-xs">
              My status: {r.my_review_status}{" "}
              {r.my_score != null ? `(${r.my_score})` : ""}
            </div>
          </Link>
        ))}
        {(!rows || rows.length === 0) && (
          <div className="text-gray-500">No submitted applications.</div>
        )}
      </div>
    </div>
  );
}
