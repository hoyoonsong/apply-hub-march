import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../../src/lib/supabase";

export default function ApplicationReview() {
  const { applicationId } = useParams();
  const [app, setApp] = useState<any | null>(null);
  const [_review, setReview] = useState<any | null>(null);
  const [score, setScore] = useState<number>(0);
  const [comments, setComments] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!applicationId) return;
        const { data, error } = await supabase.rpc(
          "app_get_application_for_review_v1",
          {
            p_application_id: applicationId,
          }
        );
        if (error) throw error;
        setApp(data);
        // For now, we'll initialize with empty review data
        // In a real app, you might want to add an RPC to get existing review
        setReview(null);
        setScore(0);
        setComments("");
      } catch (e: any) {
        setErr(e.message ?? "Not authorized or not found");
      }
    })();
  }, [applicationId]);

  async function handleSave(status: "draft" | "submitted") {
    if (!applicationId || !app) return;
    setSaving(true);
    try {
      await supabase.rpc("app_upsert_review_v1", {
        p_application_id: applicationId,
        p_ratings: {}, // TODO: wire per-question ratings if you want
        p_score: score,
        p_comments: comments || null,
        p_status: status,
      });
      alert(status === "submitted" ? "Review submitted" : "Draft saved");
    } catch (e: any) {
      alert(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!applicationId)
    return <div className="p-6 text-red-600">Application not found</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!app) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 max-w-6xl mx-auto">
      {/* Left: Applicant answers */}
      <div className="rounded-2xl border p-4">
        <h2 className="text-xl font-semibold mb-4">Applicant Responses</h2>
        <pre className="text-sm bg-slate-50 p-3 rounded">
          {JSON.stringify(app.answers, null, 2)}
        </pre>
      </div>

      {/* Right: Review panel */}
      <aside className="rounded-2xl border p-4 h-fit sticky top-6">
        <h3 className="font-semibold mb-3">Your Review</h3>

        <label className="block text-sm mb-1">Score (0–10)</label>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={score}
          onChange={(e) => setScore(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="text-sm text-slate-600 mb-3">Score: {score}</div>

        <label className="block text-sm mb-1">Comments</label>
        <textarea
          className="w-full border rounded p-2 mb-4"
          rows={6}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            disabled={saving}
            onClick={() => handleSave("draft")}
            className="rounded-lg border px-3 py-2"
          >
            Save Draft
          </button>
          <button
            disabled={saving}
            onClick={() => handleSave("submitted")}
            className="rounded-lg bg-blue-600 text-white px-3 py-2"
          >
            Submit Review
          </button>
        </div>
      </aside>
    </div>
  );
}
