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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [newOption, setNewOption] = useState("");
  // Use ref to track latest form state to avoid stale closures
  const formRef = useRef<ReviewForm>(DEFAULTS);
  const snapshotRef = useRef<ReviewForm>(DEFAULTS);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  
  useEffect(() => {
    snapshotRef.current = loadedFormSnapshot;
  }, [loadedFormSnapshot]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
    if (saving || saveStatus === "saving") {
      return;
    }
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Use the current form state directly (not refs) to ensure we have the latest
    const currentForm = form;
    const currentSnapshot = loadedFormSnapshot;
    
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
      setSaveStatus("idle");
      return;
    }
    
    setSaving(true);
    setSaveStatus("saving");
    try {
      const payload = normalizedCurrent;
      console.log("Saving reviewer form with payload:", payload);
      // setProgramReviewForm returns the full program row, which includes metadata.review_form
      const result = await setProgramReviewForm(programId, payload);
      console.log("Reviewer form saved successfully");
      
      // Extract review_form from the returned program's metadata
      // This avoids an unnecessary re-fetch - we use the data returned from the save
      const savedForm = result?.metadata?.review_form;
      const merged = { ...DEFAULTS, ...(savedForm ?? {}) } as ReviewForm;
      
      // Update form state and snapshot with the saved data
      setForm(merged);
      setLoadedFormSnapshot(merged);
      formRef.current = merged;
      snapshotRef.current = merged;
      
      // Show success message
      setSaveStatus("saved");
      
      // Clear success message after 3 seconds
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Failed to save reviewer form:", error);
      setSaveStatus("error");
      alert(`Failed to save reviewer form: ${error instanceof Error ? error.message : "Unknown error"}`);
      // Clear error message after 5 seconds
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 5000);
    } finally {
      setSaving(false);
    }
  };

  const removeOption = (opt: string) => {
    setForm((f) => {
      const newForm = {
        ...f,
        decision_options: f.decision_options.filter((o) => o !== opt),
      };
      formRef.current = newForm; // Update ref immediately
      return newForm;
    });
  };

  const addOption = () => {
    const v = newOption.trim();
    if (!v) return;
    if (form.decision_options.includes(v)) return;
    setForm((f) => {
      const newForm = { ...f, decision_options: [...f.decision_options, v] };
      formRef.current = newForm; // Update ref immediately
      return newForm;
    });
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
    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
        <h2 className="text-base font-bold text-gray-900">
          Reviewer Form Configuration
        </h2>
      </div>
      <div className="space-y-3.5">
        <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border border-purple-100 hover:bg-purple-25 transition-colors">
          <input
            type="checkbox"
            className="h-4 w-4 text-purple-600"
            checked={form.show_score}
            onChange={(e) => {
              const newForm = { ...form, show_score: e.target.checked };
              setForm(newForm);
              formRef.current = newForm; // Update ref immediately
            }}
          />
          <span className="text-sm font-medium text-gray-700">Score</span>
        </label>

        <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border border-purple-100 hover:bg-purple-25 transition-colors">
          <input
            type="checkbox"
            className="h-4 w-4 text-purple-600"
            checked={form.show_comments}
            onChange={(e) => {
              const newForm = { ...form, show_comments: e.target.checked };
              setForm(newForm);
              formRef.current = newForm; // Update ref immediately
            }}
          />
          <span className="text-sm font-medium text-gray-700">Comments</span>
        </label>

        <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border border-purple-100 hover:bg-purple-25 transition-colors">
          <input
            type="checkbox"
            className="h-4 w-4 text-purple-600"
            checked={form.show_decision}
            onChange={(e) => {
              const newForm = { ...form, show_decision: e.target.checked };
              setForm(newForm);
              formRef.current = newForm; // Update ref immediately
            }}
          />
          <span className="text-sm font-medium text-gray-700">Decision (select)</span>
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
                className="flex-1 rounded border px-2.5 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={addOption}
                className="px-2.5 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.decision_options.map((opt) => (
                <div
                  key={opt}
                  className="px-2 py-1 rounded-full border text-xs flex items-center gap-1"
                >
                  <span>{opt}</span>
                  <button
                    onClick={() => removeOption(opt)}
                    className="text-gray-500 hover:text-gray-700 text-xs leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 flex items-center justify-end gap-2">
          {saveStatus === "saved" && (
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Saved successfully!</span>
            </div>
          )}
          {saveStatus === "error" && (
            <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>Save failed</span>
            </div>
          )}
          <button
            disabled={saving || saveStatus === "saving"}
            onClick={save}
            className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {saving || saveStatus === "saving" ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </span>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
