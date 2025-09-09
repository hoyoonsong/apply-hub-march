// src/pages/review/ReviewAppPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getApplicationForReview,
  upsertReview,
  Ratings,
} from "../../lib/reviewApi";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import AnswersViewer from "../../components/review/AnswersViewer";
import {
  fetchApplicationForReview,
  saveReviewDraft,
  submitReview,
} from "../../lib/reviews";

function useDebounce(fn: (...args: any[]) => void, ms: number) {
  const t = useRef<number | undefined>(undefined);
  return (...args: any[]) => {
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => fn(...args), ms);
  };
}

export default function ReviewAppPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [appRow, setAppRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [ratings, setRatings] = useState<Ratings>({});
  const [score, setScore] = useState<number | null>(null);
  const [comments, setComments] = useState<string>("");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const storageKey = useMemo(
    () => `review-draft:${applicationId}`,
    [applicationId]
  );

  // Load app + any server review state
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!applicationId) return;
      setLoadErr(null);
      setLoading(true);
      try {
        const data = await fetchApplicationForReview(supabase, applicationId);
        if (cancelled) return;
        setAppRow(data);

        // Try to fetch an existing review row for this reviewer via upsert draft (no-op)
        // or rely on local storage rehydrate.
        const ls = localStorage.getItem(storageKey);
        if (ls) {
          const parsed = JSON.parse(ls);
          setRatings(parsed.ratings ?? {});
          setScore(Number.isFinite(parsed.score) ? parsed.score : null);
          setComments(parsed.comments ?? "");
        }
      } catch (e: any) {
        if (!cancelled) setLoadErr(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [applicationId, storageKey]);

  // Debounced change-only autosave to DB + localStorage backup
  const debouncedSave = useDebounce(
    async (payload: {
      ratings: Ratings;
      score: number | null;
      comments: string;
    }) => {
      if (!applicationId || !appRow) return;
      try {
        setSaving("saving");
        localStorage.setItem(storageKey, JSON.stringify(payload));
        await saveReviewDraft(supabase, {
          applicationId: appRow.id,
          ratings: payload.ratings ?? {},
          score: payload.score ?? null,
          comments: payload.comments ?? "",
        });
        setSaving("saved");
        // soft reset the UI indicator
        setTimeout(() => setSaving("idle"), 800);
      } catch (e) {
        console.error(e);
        setSaving("error");
      }
    },
    800
  );

  // When any field changes, debounce-save
  useEffect(() => {
    if (appRow) {
      debouncedSave({ ratings, score, comments });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(ratings), score, comments, appRow]);

  async function handleSubmit() {
    if (!applicationId || !appRow) return;
    try {
      setSaving("saving");
      await submitReview(supabase, {
        applicationId: appRow.id,
        ratings,
        score,
        comments,
      });
      localStorage.removeItem(storageKey);
      setSaving("saved");
      alert("Review submitted ✅");
    } catch (e: any) {
      console.error(e);
      setSaving("error");
      alert(e?.message ?? "Submit failed");
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (loadErr) return <div className="text-red-600">{loadErr}</div>;
  if (!appRow)
    return <div style={{ padding: 24 }}>Not found or not authorized.</div>;

  const schema = appRow?.application_schema ?? {};
  const answers = appRow?.answers ?? {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="text-2xl font-semibold mb-1">Review Application</div>
          <div className="text-sm text-gray-500">
            Status: <span className="font-medium">{appRow.status}</span>
          </div>
        </div>

        {/* Main Content - Side by Side */}
        <div className="flex gap-6">
          {/* Left Side - Applicant Responses */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-lg font-semibold mb-4">
                Applicant Responses
              </div>
              <AnswersViewer applicationSchema={schema} answers={answers} />
            </div>
          </div>

          {/* Right Side - Review Form Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <div className="text-lg font-semibold mb-4">Your Review</div>

              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="block mb-2 font-medium">Score</span>
                  <input
                    type="number"
                    className="border rounded px-3 py-2 w-full"
                    value={score ?? ""}
                    onChange={(e) =>
                      setScore(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    placeholder="Enter score"
                  />
                </label>

                <label className="block text-sm">
                  <span className="block mb-2 font-medium">Comments</span>
                  <textarea
                    className="border rounded px-3 py-2 w-full h-32 resize-none"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add your review comments..."
                  />
                </label>

                <label className="block text-sm">
                  <span className="block mb-2 font-medium">Ratings (JSON)</span>
                  <textarea
                    className="border rounded px-3 py-2 w-full h-32 font-mono text-xs resize-none"
                    value={JSON.stringify(ratings ?? {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const v = JSON.parse(e.target.value || "{}");
                        setRatings(v);
                      } catch {
                        // ignore until it's valid JSON
                      }
                    }}
                    placeholder='{"q1": 5, "notes": "great"}'
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Example: {'{ "q1": 5, "notes": "great" }'}
                  </div>
                </label>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    onClick={handleSubmit}
                  >
                    Submit Review
                  </button>

                  <div className="mt-3 text-center">
                    {saving === "saving" && (
                      <span className="text-xs text-gray-500">Saving…</span>
                    )}
                    {saving === "saved" && (
                      <span className="text-xs text-green-600">✓ Saved</span>
                    )}
                    {saving === "error" && (
                      <span className="text-xs text-red-600">✗ Save error</span>
                    )}
                    {saving === "idle" && (
                      <span className="text-xs text-gray-400">Auto-saved</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
