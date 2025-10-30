"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Row = {
  application_id: string;
  program_name: string;
  applicant_name: string;
  // Allow custom decisions saved by admins
  decision: string | null;
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

  // Keep the complete set and derive filtered rows for display
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnpublished, setOnlyUnpublished] = useState(true);
  const [programName, setProgramName] = useState<string>("");
  const [visibility, setVisibility] = useState<Visibility>({
    decision: true,
    score: false,
    comments: false,
    customMessage: null,
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [decisionFilter, setDecisionFilter] = useState<string>("all");

  // Prefill from program metadata right-rail reviewer config
  useEffect(() => {
    (async () => {
      const { data: prg } = await supabase
        .from("programs")
        .select("name, metadata")
        .eq("id", programId)
        .single();
      if (prg) {
        setProgramName(prg.name);
        const rf = prg.metadata?.reviewerForm || {};
        setVisibility((v) => ({
          decision: rf.decision ?? v.decision,
          score: rf.score ?? v.score,
          comments: rf.comments ?? v.comments,
          customMessage: null,
        }));
      }
    })();
  }, [programId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_publish_queue", {
      program_id: programId,
    });
    if (!error) {
      const list = (data as Row[]) ?? [];
      setAllRows(list);
      setSelected({});
    }
    setLoading(false);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [programId]);

  // Derive unique decision options from all rows (supports custom decisions)
  const decisionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) if (r.decision) set.add(r.decision);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  // Apply filters
  const rows = useMemo(() => {
    let list = onlyUnpublished
      ? allRows.filter((r) => !r.already_published)
      : allRows;
    if (decisionFilter !== "all") {
      list = list.filter(
        (r) => (r.decision ?? "").toLowerCase() === decisionFilter.toLowerCase()
      );
    }
    return list;
  }, [allRows, onlyUnpublished, decisionFilter]);

  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected]
  );

  // Toolbar state helpers
  const isFiltered = useMemo(() => decisionFilter !== "all", [decisionFilter]);

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
    <div className="max-w-7xl mx-auto p-3 md:p-6">
      <div className="mb-4 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-start space-y-3 md:space-y-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
            Publish Results - <span className="font-normal">{programName}</span>
          </h1>

          <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600">
            Manage and publish application results for your program
          </p>
        </div>
        <Link
          to={`/org/${orgSlug}/admin/publish-results`}
          className="inline-flex items-center px-3 md:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-xs md:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        >
          <svg
            className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Gallery
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
        <div className="lg:col-span-3 space-y-4 md:space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-3">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                  Results Queue
                </h2>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                {decisionOptions.length > 0 && (
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                    <span className="hidden sm:inline text-gray-600">
                      Decisions
                    </span>
                    <div className="relative">
                      <select
                        value={decisionFilter}
                        onChange={(e) => {
                          setDecisionFilter(e.target.value);
                          setSelected({});
                        }}
                        className="appearance-none border border-gray-300 rounded-md pl-3 pr-8 py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[150px]"
                      >
                        <option value="all">All decisions</option>
                        {decisionOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                        ▾
                      </span>
                    </div>
                    {decisionFilter !== "all" && (
                      <button
                        onClick={() => setDecisionFilter("all")}
                        className="text-gray-500 hover:text-gray-700 rounded px-2 py-1"
                        title="Clear filter"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                <div className="hidden md:block h-6 w-px bg-gray-200" />
                <label className="flex items-center gap-2 text-xs md:text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={onlyUnpublished}
                    onChange={(e) => {
                      setOnlyUnpublished(e.target.checked);
                      setSelected({});
                    }}
                    className="h-3 w-3 md:h-4 md:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Unpublished only
                </label>
                <div className="hidden md:block h-6 w-px bg-gray-200" />
                {selectedIds.length > 0 || isFiltered ? (
                  <button
                    onClick={publishSelected}
                    disabled={loading || selectedIds.length === 0}
                    className="inline-flex items-center px-3 md:px-4 py-2 border border-transparent text-xs md:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white mr-1 md:mr-2"></div>
                        Publishing...
                      </>
                    ) : (
                      `Publish selected (${selectedIds.length})`
                    )}
                  </button>
                ) : (
                  <button
                    onClick={publishAll}
                    disabled={loading || rows.length === 0}
                    className="inline-flex items-center px-3 md:px-4 py-2 border border-transparent text-xs md:text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white mr-1 md:mr-2"></div>
                        Publishing...
                      </>
                    ) : (
                      "Publish all finalized"
                    )}
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading results...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No results to publish
                </h3>
                <p className="mt-2 text-gray-500">
                  {onlyUnpublished
                    ? "No unpublished finalized reviews found."
                    : "No finalized reviews found for this program."}
                </p>
              </div>
            ) : (
              <div className="overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left">
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
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Program
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applicant
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Decision
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Comments
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Finalized
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Published
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map((r) => (
                      <tr key={r.application_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={!!selected[r.application_id]}
                            onChange={(e) =>
                              setSelected((s) => ({
                                ...s,
                                [r.application_id]: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[160px] truncate">
                          {r.program_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[140px] truncate">
                          {r.applicant_name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {r.decision ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                r.decision === "accept"
                                  ? "bg-green-100 text-green-800"
                                  : r.decision === "waitlist"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {r.decision}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {r.score ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[280px]">
                          <div className="truncate" title={r.comments ?? ""}>
                            {r.comments
                              ? (() => {
                                  const words = r.comments.split(" ");
                                  return words.length > 4
                                    ? words.slice(0, 4).join(" ") + "..."
                                    : r.comments;
                                })()
                              : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {r.review_finalized_at
                            ? new Date(
                                r.review_finalized_at
                              ).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              r.already_published
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {r.already_published ? "Yes" : "No"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {rows.length > 0 && (
              <div className="mt-5 md:mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{selectedIds.length}</span> of{" "}
                  {rows.length} selected
                </div>
                <button
                  onClick={publishSelected}
                  disabled={loading || selectedIds.length === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Publishing...
                    </>
                  ) : (
                    `Publish selected (${selectedIds.length})`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              What to send
            </h3>
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={visibility.decision}
                    onChange={(e) =>
                      setVisibility((v) => ({
                        ...v,
                        decision: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="font-medium">Decision</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={visibility.score}
                    onChange={(e) =>
                      setVisibility((v) => ({ ...v, score: e.target.checked }))
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="font-medium">Score</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={visibility.comments}
                    onChange={(e) =>
                      setVisibility((v) => ({
                        ...v,
                        comments: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="font-medium">Reviewer comments</span>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Optional custom message
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Add a custom message to include with the results..."
                  value={visibility.customMessage ?? ""}
                  onChange={(e) =>
                    setVisibility((v) => ({
                      ...v,
                      customMessage: e.target.value || null,
                    }))
                  }
                  rows={4}
                />
                <p className="mt-1 text-xs text-gray-500">
                  This message will be included with all published results.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
