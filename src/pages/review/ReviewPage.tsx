import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type AppRow = {
  id: string;
  user_id: string;
  program_id: string;
  status:
    | "submitted"
    | "reviewing"
    | "accepted"
    | "rejected"
    | "waitlisted"
    | "draft";
  answers: any;
};

export default function ReviewApplication() {
  const { applicationId } = useParams();
  const [appRow, setAppRow] = useState<AppRow | null>(null);
  const [ratings, setRatings] = useState<any>({});
  const [score, setScore] = useState<number | undefined>();
  const [comments, setComments] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      const { data, error } = await supabase.rpc(
        "app_get_application_for_review_v1",
        { p_application_id: applicationId }
      );
      if (!ignore) {
        if (error) alert(error.message);
        else setAppRow(data as any);
      }
    }
    if (applicationId) load();
    return () => {
      ignore = true;
    };
  }, [applicationId]);

  async function save(status: "draft" | "submitted") {
    const { error } = await supabase.rpc("app_upsert_review_v1", {
      p_application_id: applicationId,
      p_ratings: ratings,
      p_score: score ?? null,
      p_comments: comments,
      p_status: status,
    });
    if (error) alert(error.message);
    else alert(status === "submitted" ? "Review submitted!" : "Saved!");
  }

  if (!appRow) return <div className="p-6">Loading…</div>;

  return (
    <div className="container space-y-4">
      <h1 className="text-xl font-semibold">Application</h1>

      <pre className="p-3 bg-gray-50 border rounded overflow-auto text-sm">
        {JSON.stringify(appRow.answers, null, 2)}
      </pre>

      <div className="space-y-2">
        <label className="block">
          <span className="text-sm">Score</span>
          <input
            type="number"
            className="mt-1 p-2 border rounded w-32"
            value={score ?? ""}
            onChange={(e) =>
              setScore(
                e.target.value === "" ? undefined : Number(e.target.value)
              )
            }
          />
        </label>
        <label className="block">
          <span className="text-sm">Comments</span>
          <textarea
            className="mt-1 p-2 border rounded w-full"
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          className="px-3 py-2 border rounded"
          onClick={() => save("draft")}
        >
          Save
        </button>
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded"
          onClick={() => save("submitted")}
        >
          Submit Review
        </button>
      </div>
    </div>
  );
}
