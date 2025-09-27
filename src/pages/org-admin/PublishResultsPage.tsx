"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Row = {
  application_id: string;
  program_name: string;
  applicant_name: string;
  decision: "accept" | "waitlist" | "reject" | null;
  score: number | null;
  comments: string | null;
  already_published: boolean;
  review_finalized_at: string | null;
};

type Visibility = {
  decision: boolean;
  score: boolean;
  comments: boolean;
  customMessage?: string | null;
};

export default function PublishResultsPage() {
  const { orgSlug, programId } = useParams<{
    orgSlug: string;
    programId: string;
  }>();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnpublished, setOnlyUnpublished] = useState(true);
  const [visibility, setVisibility] = useState<Visibility>({
    decision: true,
    score: false,
    comments: false,
    customMessage: null,
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Prefill from program metadata right-rail reviewer config
  useEffect(() => {
    (async () => {
      const { data: prg } = await supabase
        .from("programs")
        .select("metadata")
        .eq("id", programId)
        .single();
      const rf = prg?.metadata?.reviewerForm || {};
      setVisibility((v) => ({
        decision: rf.decision ?? v.decision,
        score: rf.score ?? v.score,
        comments: rf.comments ?? v.comments,
        customMessage: null,
      }));
    })();
  }, [programId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_publish_queue", {
      program_id: programId,
    });
    if (!error) {
      const list = (data as Row[]) ?? [];
      setRows(
        onlyUnpublished ? list.filter((r) => !r.already_published) : list
      );
      setSelected({});
    }
    setLoading(false);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [programId, onlyUnpublished]);

  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected]
  );

  const publishAll = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc(
      "publish_all_finalized_for_program_v1",
      {
        p_program_id: programId,
        p_visibility: visibility,
        p_only_unpublished: onlyUnpublished,
      }
    );
    setLoading(false);
    if (error) return alert(error.message);
    alert(`Published ${data?.length ?? 0} finalized result(s).`);
    load();
  };

  const publishSelected = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("publish_results_v1", {
      p_application_ids: selectedIds,
      p_visibility: visibility,
    });
    setLoading(false);
    if (error) return alert(error.message);
    alert(`Published ${data?.length ?? 0} selected result(s).`);
    load();
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Publish Results</h1>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyUnpublished}
                  onChange={(e) => setOnlyUnpublished(e.target.checked)}
                />
                Only show not-yet-published
              </label>
              <button
                onClick={publishAll}
                disabled={loading || rows.length === 0}
                className="px-4 py-2 rounded bg-black text-white"
              >
                Publish all finalized results
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-4 border">
            {loading ? (
              "Loading…"
            ) : rows.length === 0 ? (
              "No finalized reviews to publish."
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th>
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            const all = Object.fromEntries(
                              rows.map((r) => [
                                r.application_id,
                                e.target.checked,
                              ])
                            );
                            setSelected(all);
                          }}
                        />
                      </th>
                      <th>Program</th>
                      <th>Applicant</th>
                      <th>Decision</th>
                      <th>Score</th>
                      <th>Comments</th>
                      <th>Finalized</th>
                      <th>Already Published</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.application_id} className="border-t">
                        <td>
                          <input
                            type="checkbox"
                            checked={!!selected[r.application_id]}
                            onChange={(e) =>
                              setSelected((s) => ({
                                ...s,
                                [r.application_id]: e.target.checked,
                              }))
                            }
                          />
                        </td>
                        <td>{r.program_name}</td>
                        <td>{r.applicant_name ?? "—"}</td>
                        <td>{r.decision ?? "—"}</td>
                        <td>{r.score ?? "—"}</td>
                        <td className="max-w-[360px] truncate">
                          {r.comments ?? "—"}
                        </td>
                        <td>
                          {r.review_finalized_at
                            ? new Date(r.review_finalized_at).toLocaleString()
                            : "—"}
                        </td>
                        <td>{r.already_published ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4">
              <button
                onClick={publishSelected}
                disabled={loading || selectedIds.length === 0}
                className="px-4 py-2 rounded border"
              >
                Publish selected
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl p-4 border">
            <h3 className="text-lg font-semibold">What to send</h3>
            <div className="mt-2 space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={visibility.decision}
                  onChange={(e) =>
                    setVisibility((v) => ({ ...v, decision: e.target.checked }))
                  }
                />
                Decision
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={visibility.score}
                  onChange={(e) =>
                    setVisibility((v) => ({ ...v, score: e.target.checked }))
                  }
                />
                Score
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={visibility.comments}
                  onChange={(e) =>
                    setVisibility((v) => ({ ...v, comments: e.target.checked }))
                  }
                />
                Reviewer comments
              </label>
              <textarea
                className="w-full border rounded p-2 text-sm"
                placeholder="Optional custom message"
                value={visibility.customMessage ?? ""}
                onChange={(e) =>
                  setVisibility((v) => ({
                    ...v,
                    customMessage: e.target.value || null,
                  }))
                }
                rows={4}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
