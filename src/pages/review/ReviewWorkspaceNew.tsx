import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getApplicationForReview, upsertReview } from "../../lib/api";

type QA = {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};

export default function ReviewWorkspace() {
  const { programId, applicationId } = useParams<{
    programId: string;
    applicationId: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [app, setApp] = useState<any>(null);

  // review state
  const [score, setScore] = useState<number>(0);
  const [rubric, setRubric] = useState<Record<string, any>>({});
  const [comments, setComments] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getApplicationForReview(applicationId!);
        setApp(data);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load application");
      } finally {
        setLoading(false);
      }
    })();
  }, [applicationId]);

  const schema: QA[] = useMemo(
    () => (app?.schema?.questions ?? []) as QA[],
    [app]
  );
  const answers = app?.answers ?? {};

  async function saveReview() {
    try {
      await upsertReview({
        applicationId: applicationId!,
        score: score,
        ratings: rubric,
        comments: comments,
        status: "draft",
      });
      alert("Review saved");
    } catch (e: any) {
      alert(e.message ?? "Failed to save review");
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!app) return null;

  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      <div className="col-span-3">
        <Link
          to={`/review/${programId}/queue`}
          className="text-sm text-blue-600"
        >
          ← Back to queue
        </Link>
        <div className="mt-4 rounded-lg border">
          <div className="border-b p-3 font-medium">Applicant</div>
          <div className="p-3 text-sm">
            <div>{app.applicant_profile?.full_name ?? "Unknown"}</div>
            <div className="text-gray-500">
              Status: {app.application?.status}
            </div>
            <div className="text-gray-500">
              Submitted: {app.application?.updated_at}
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-6">
        <div className="rounded-lg border">
          <div className="border-b p-3 font-medium">Answers</div>
          <div className="p-4 space-y-4">
            {schema.length === 0 && (
              <div className="text-sm text-gray-500">No custom questions.</div>
            )}
            {schema.map((q) => (
              <div key={q.id}>
                <div className="text-sm font-medium">{q.label}</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {renderAnswer(q, answers[q.id])}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-span-3">
        <div className="sticky top-4 space-y-4">
          <div className="rounded-lg border">
            <div className="border-b p-3 font-medium">Score</div>
            <div className="p-3 space-y-3">
              <label className="text-sm">Score (0–10)</label>
              <input
                type="number"
                min={0}
                max={10}
                step={1}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full rounded border px-2 py-1"
              />
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="border-b p-3 font-medium">Rubric notes</div>
            <div className="p-3 space-y-3">
              {schema.map((q) => (
                <div key={q.id}>
                  <label className="text-xs text-gray-600">{q.label}</label>
                  <textarea
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    rows={2}
                    value={rubric[q.id] ?? ""}
                    onChange={(e) =>
                      setRubric({ ...rubric, [q.id]: e.target.value })
                    }
                    placeholder="Notes for this question…"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="border-b p-3 font-medium">Comments</div>
            <div className="p-3">
              <textarea
                className="w-full rounded border px-2 py-1 text-sm"
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="General feedback…"
              />
            </div>
          </div>

          <button
            onClick={saveReview}
            className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white"
          >
            Save Review
          </button>
        </div>
      </div>
    </div>
  );
}

function renderAnswer(q: { type: string }, value: any) {
  if (value == null || value === "")
    return <span className="text-gray-400">—</span>;
  switch (q.type) {
    case "FILE":
      // value could be a storage path/URL if you wired uploads; render a link if so.
      return typeof value === "string" ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          View file
        </a>
      ) : (
        JSON.stringify(value)
      );
    case "CHECKBOX":
      return value ? "Yes" : "No";
    case "SELECT":
      return value;
    case "DATE":
      return new Date(value).toLocaleString();
    default:
      return String(value);
  }
}
