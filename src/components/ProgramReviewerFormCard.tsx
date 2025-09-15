import { useEffect, useState } from "react";
import { getProgramReviewForm, setProgramReviewForm } from "../lib/api";

type ReviewForm = {
  show_score: boolean;
  show_comments: boolean;
  show_decision: boolean;
  decision_options: string[];
};

const DEFAULTS: ReviewForm = {
  show_score: true,
  show_comments: true,
  show_decision: false,
  decision_options: ["accept", "waitlist", "reject"],
};

export default function ProgramReviewerFormCard({
  programId,
}: {
  programId: string;
}) {
  const [form, setForm] = useState<ReviewForm>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getProgramReviewForm(programId);
        setForm({ ...DEFAULTS, ...(data ?? {}) });
      } catch (error) {
        console.error("Failed to load reviewer form config:", error);
        alert("Failed to load reviewer form config");
      } finally {
        setLoading(false);
      }
    })();
  }, [programId]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        decision_options:
          form.show_decision && form.decision_options.length === 0
            ? DEFAULTS.decision_options
            : form.decision_options,
      };
      console.log("Saving reviewer form with payload:", payload);
      await setProgramReviewForm(programId, payload);
      console.log("Reviewer form saved successfully");
      alert("Reviewer form saved successfully");
    } catch (error) {
      console.error("Failed to save reviewer form:", error);
      alert("Failed to save reviewer form");
    } finally {
      setSaving(false);
    }
  };

  const removeOption = (opt: string) =>
    setForm((f) => ({
      ...f,
      decision_options: f.decision_options.filter((o) => o !== opt),
    }));

  const addOption = () => {
    const v = newOption.trim();
    if (!v) return;
    if (form.decision_options.includes(v)) return;
    setForm((f) => ({ ...f, decision_options: [...f.decision_options, v] }));
    setNewOption("");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6 mt-6">
        <div className="text-sm text-gray-500">
          Loading reviewer form config...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Reviewer Form</h3>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Score</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.show_score}
              onChange={(e) =>
                setForm((f) => ({ ...f, show_score: e.target.checked }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Comments</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.show_comments}
              onChange={(e) =>
                setForm((f) => ({ ...f, show_comments: e.target.checked }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Decision (select)</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.show_decision}
              onChange={(e) =>
                setForm((f) => ({ ...f, show_decision: e.target.checked }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {form.show_decision && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">Decision options</div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., accept"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addOption();
                }}
                className="flex-1 rounded border px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={addOption}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.decision_options.map((opt) => (
                <div
                  key={opt}
                  className="px-2 py-1 rounded-full border text-sm flex items-center gap-2"
                >
                  <span>{opt}</span>
                  <button
                    onClick={() => removeOption(opt)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            disabled={saving}
            onClick={save}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
