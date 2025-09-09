import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { upsertReview } from "../../lib/api";
import { supabase } from "../../lib/supabase";

type AppRow = {
  id: string;
  program_id: string;
  user_id: string;
  status: string;
  answers: Record<string, any>;
  created_at: string;
  updated_at: string;
};

type ProgramRow = {
  id: string;
  name: string;
  metadata: any;
};

function useDebounce<T extends (...args: any[]) => void>(fn: T, wait = 600) {
  const ref = useRef<number | null>(null);
  return (...args: Parameters<T>) => {
    if (ref.current) window.clearTimeout(ref.current);
    ref.current = window.setTimeout(() => fn(...args), wait);
  };
}

export default function ReviewWorkspacePage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [app, setApp] = useState<AppRow | null>(null);
  const [program, setProgram] = useState<ProgramRow | null>(null);
  const [review, setReview] = useState<ReviewRow | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<string, number | string>>({});
  const [comments, setComments] = useState<string>("");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [err, setErr] = useState<string | null>(null);

  // Load application (reviewers have SELECT via policy we added)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("applications")
          .select(
            "id, program_id, user_id, status, answers, created_at, updated_at"
          )
          .eq("id", applicationId)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Application not found.");
        if (active) setApp(data as any);

        // Try to fetch program to get schema/labels (may be allowed; if not, skip)
        const { data: p, error: pErr } = await supabase
          .from("programs")
          .select("id, name, metadata")
          .eq("id", data.program_id)
          .limit(1)
          .maybeSingle();
        if (!pErr && p && active) setProgram(p as any);
      } catch (e: any) {
        if (active) setErr(e.message ?? "Failed to load application.");
      }
    })();
    return () => {
      active = false;
    };
  }, [applicationId]);

  // Load (or initialize) my review
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await getMyReview(applicationId!);
        if (!active) return;
        if (r) {
          setReview(r);
          setScore(r.score ?? null);
          setRatings(r.ratings ?? {});
          setComments(r.comments ?? "");
        } else {
          // no row yet — keep local draft until first save
          setReview(null);
        }
      } catch (e: any) {
        setErr(e.message ?? "Failed to load your review.");
      }
    })();
    return () => {
      active = false;
    };
  }, [applicationId]);

  const debouncedSave = useDebounce(
    async (payload: {
      score: number | null;
      ratings: any;
      comments: string;
    }) => {
      try {
        setSaving("saving");
        const saved = await upsertReview({
          application_id: applicationId!,
          score: payload.score,
          ratings: payload.ratings,
          comments: payload.comments,
          status: "draft",
        });
        setReview(saved);
        setSaving("saved");
        setTimeout(() => setSaving("idle"), 800);
      } catch (e) {
        setSaving("error");
      }
    },
    600
  );

  // Autosave on changes (draft)
  useEffect(() => {
    if (!applicationId) return;
    debouncedSave({ score, ratings, comments });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, score, ratings, comments]);

  async function handleSubmit() {
    if (
      !window.confirm(
        "Submit review? You won't be able to edit after submission."
      )
    )
      return;
    try {
      const saved = await upsertReview({
        application_id: applicationId!,
        score,
        ratings,
        comments,
        status: "submitted",
      });
      setReview(saved);
    } catch (e: any) {
      alert(e.message ?? "Failed to submit review.");
    }
  }

  const schemaFields: Array<{ id: string; label: string; type: string }> =
    useMemo(() => {
      const s = program?.metadata?.application_schema?.fields;
      if (Array.isArray(s)) return s;
      return []; // fallback to generic rendering below
    }, [program]);

  const submitted = review?.status === "submitted";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Review {program?.name ? `— ${program.name}` : ""}
          </h1>
          <p className="text-sm text-gray-500">
            Application {applicationId?.slice(0, 6)}… — status:{" "}
            {app?.status ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {saving === "saving" && "Saving…"}
            {saving === "saved" && "Saved"}
            {saving === "error" && "Save failed"}
          </span>
          <Link
            to={`/review/${app?.program_id}`}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            Back to Inbox
          </Link>
          <button
            disabled={submitted}
            onClick={handleSubmit}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
              submitted ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {submitted ? "Submitted" : "Submit review"}
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content: applicant answers */}
        <div className="lg:col-span-2">
          <section className="mb-6 rounded-xl border bg-white p-4">
            <h2 className="mb-3 text-lg font-medium">Applicant Answers</h2>
            {app?.answers ? (
              <div className="space-y-4">
                {schemaFields.length > 0 ? (
                  schemaFields.map((f) => {
                    // Handle id-or-label keys; fall back to anything
                    const val =
                      app.answers?.[f.id] ??
                      app.answers?.[f.label] ??
                      app.answers?.[
                        f.label?.toLowerCase()?.replace(/\s+/g, "_") || ""
                      ];

                    return (
                      <div key={f.id} className="rounded-lg border p-3">
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {f.type}
                        </div>
                        <div className="text-sm font-medium">
                          {f.label || f.id}
                        </div>
                        <AnswerValue value={val} />
                      </div>
                    );
                  })
                ) : (
                  // Fallback: generic pretty print
                  <div className="rounded-lg border p-3 text-sm">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(app.answers, null, 2)}
                    </pre>
                    <div className="mt-2 text-xs text-gray-500">
                      (No builder schema available to label fields.)
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No answers found.</div>
            )}
          </section>

          <section className="rounded-xl border bg-white p-4">
            <h2 className="mb-3 text-lg font-medium">Attachments</h2>
            <div className="text-sm text-gray-500">
              If your form stores file URLs in <code>answers</code>, render them
              here.
            </div>
          </section>
        </div>

        {/* Sidebar: scoring & comments */}
        <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-2rem)]">
          <div className="rounded-xl border bg-white p-4">
            <h3 className="mb-3 text-base font-semibold">Score & Comments</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium">Score</label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={Number(score ?? 0)}
                  disabled={submitted}
                  onChange={(e) => setScore(parseInt(e.target.value, 10))}
                  className="w-full"
                />
                <div className="w-10 text-right text-sm font-medium">
                  {score ?? 0}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                0–10 scale (adjust as needed).
              </p>
            </div>

            <CriterionList
              disabled={submitted}
              ratings={ratings}
              onChange={(next) => setRatings(next)}
            />

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium">
                Private Comments
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-md border p-2 text-sm"
                placeholder="Notes visible to staff only…"
                disabled={submitted}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function AnswerValue({ value }: { value: any }) {
  if (value == null) return <div className="text-sm text-gray-400">—</div>;
  if (typeof value === "string") {
    return <div className="mt-1 whitespace-pre-wrap text-sm">{value}</div>;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <div className="mt-1 text-sm">{String(value)}</div>;
  }
  // arrays / objects (e.g., multi-select)
  return (
    <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function CriterionList({
  ratings,
  onChange,
  disabled,
}: {
  ratings: Record<string, number | string>;
  onChange: (r: Record<string, number | string>) => void;
  disabled?: boolean;
}) {
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState<number | string>("");

  function updateKey(k: string, v: number | string) {
    onChange({ ...ratings, [k]: v });
  }
  function removeKey(k: string) {
    const { [k]: _, ...rest } = ratings;
    onChange(rest);
  }
  function addKey() {
    const key = newKey.trim();
    if (!key) return;
    onChange({ ...ratings, [key]: newVal || 0 });
    setNewKey("");
    setNewVal("");
  }

  const entries = Object.entries(ratings);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium">Criteria</label>
        <span className="text-xs text-gray-500">
          per-criterion ratings (optional)
        </span>
      </div>
      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <div className="w-40 truncate text-sm">{k}</div>
            <input
              disabled={disabled}
              type="number"
              className="w-24 rounded-md border px-2 py-1 text-sm"
              value={typeof v === "number" ? v : Number(v || 0)}
              onChange={(e) => updateKey(k, parseFloat(e.target.value))}
            />
            <button
              disabled={disabled}
              onClick={() => removeKey(k)}
              className="rounded-md border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Remove
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-2">
          <input
            disabled={disabled}
            placeholder="Add criterion (e.g., Musicianship)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="w-full rounded-md border px-2 py-1 text-sm"
          />
          <input
            disabled={disabled}
            type="number"
            placeholder="0"
            value={newVal as any}
            onChange={(e) => setNewVal(parseFloat(e.target.value))}
            className="w-24 rounded-md border px-2 py-1 text-sm"
          />
          <button
            disabled={disabled}
            onClick={addKey}
            className="rounded-md bg-gray-800 px-2 py-1 text-xs text-white hover:bg-black"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
