import { useEffect, useState, useRef } from "react";
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
  const [loadedFormSnapshot, setLoadedFormSnapshot] = useState<ReviewForm>(
    DEFAULTS
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newOption, setNewOption] = useState("");
  // Use ref to track latest form state to avoid stale closures
  const formRef = useRef<ReviewForm>(DEFAULTS);
  const snapshotRef = useRef<ReviewForm>(DEFAULTS);
  
  // Keep refs in sync with state
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  
  useEffect(() => {
    snapshotRef.current = loadedFormSnapshot;
  }, [loadedFormSnapshot]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getProgramReviewForm(programId);
        const merged = { ...DEFAULTS, ...(data ?? {}) } as ReviewForm;
        setForm(merged);
        setLoadedFormSnapshot(merged);
        // Update refs immediately
        formRef.current = merged;
        snapshotRef.current = merged;
      } catch (error) {
        console.error("Failed to load reviewer form config:", error);
        alert("Failed to load reviewer form config");
      } finally {
        setLoading(false);
      }
    })();
  }, [programId]);

  const save = async () => {
    // Prevent saving if already saving
    if (saving) {
      return;
    }
    
    // Use refs to get the latest state (avoids stale closures)
    const currentForm = formRef.current;
    const currentSnapshot = snapshotRef.current;
    
    // Normalize the current form state
    const normalizedCurrent: ReviewForm = {
      ...currentForm,
      decision_options:
        currentForm.show_decision && currentForm.decision_options.length === 0
          ? DEFAULTS.decision_options
          : currentForm.decision_options,
    };
    
    // Normalize the snapshot for comparison
    const normalizedSnapshot: ReviewForm = {
      ...currentSnapshot,
      decision_options:
        currentSnapshot.show_decision && currentSnapshot.decision_options.length === 0
          ? DEFAULTS.decision_options
          : currentSnapshot.decision_options,
    };
    
    // Prevent redundant saves if nothing changed
    if (JSON.stringify(normalizedCurrent) === JSON.stringify(normalizedSnapshot)) {
      console.log("No changes detected, skipping save");
      return;
    }
    
    setSaving(true);
    try {
      const payload = normalizedCurrent;
      console.log("Saving reviewer form with payload:", payload);
      await setProgramReviewForm(programId, payload);
      console.log("Reviewer form saved successfully");
      
      // Update snapshot immediately to prevent duplicate saves
      setLoadedFormSnapshot(normalizedCurrent);
      snapshotRef.current = normalizedCurrent;
      
      // Re-fetch to ensure UI reflects persisted state (this might return slightly different data)
      const latest = await getProgramReviewForm(programId);
      const merged = { ...DEFAULTS, ...(latest ?? {}) } as ReviewForm;
      setForm(merged);
      setLoadedFormSnapshot(merged);
      formRef.current = merged;
      snapshotRef.current = merged;
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
    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
        <h2 className="text-lg font-bold text-gray-900">
          Reviewer Form Configuration
        </h2>
      </div>
      <div className="space-y-4">
        <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-100 hover:bg-purple-25 transition-colors">
          <input
            type="checkbox"
            className="h-4 w-4 text-purple-600"
            checked={form.show_score}
            onChange={(e) => {
              const newForm = { ...form, show_score: e.target.checked };
              setForm(newForm);
            }}
          />
          <span className="font-medium text-gray-700">Score</span>
        </label>

        <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-100 hover:bg-purple-25 transition-colors">
          <input
            type="checkbox"
            className="h-4 w-4 text-purple-600"
            checked={form.show_comments}
            onChange={(e) => {
              const newForm = { ...form, show_comments: e.target.checked };
              setForm(newForm);
            }}
          />
          <span className="font-medium text-gray-700">Comments</span>
        </label>

        <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-100 hover:bg-purple-25 transition-colors">
          <input
            type="checkbox"
            className="h-4 w-4 text-purple-600"
            checked={form.show_decision}
            onChange={(e) => {
              const newForm = { ...form, show_decision: e.target.checked };
              setForm(newForm);
            }}
          />
          <span className="font-medium text-gray-700">Decision (select)</span>
        </label>

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
                className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
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

        <div className="pt-4 flex justify-end">
          <button
            disabled={saving}
            onClick={save}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 font-medium"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
