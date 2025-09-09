import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isUUID } from "../../lib/id";
import {
  getApplication,
  getProgramSchema,
  submitApplication,
} from "../../lib/rpc";
import { useApplicationAutosave } from "../../components/useApplicationAutosave";
import type { ProgramApplicationSchema } from "../../types/application";

type AppRow = {
  id: string;
  program_id: string;
  user_id: string;
  status:
    | "draft"
    | "submitted"
    | "reviewing"
    | "accepted"
    | "rejected"
    | "waitlisted";
  answers: any;
  created_at: string;
  updated_at: string;
  // projected fields from app_get_application_v1
  program_name?: string;
  program_metadata?: any;
};

export default function ApplicationPage() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const [appRow, setAppRow] = useState<AppRow | null>(null);
  const [schema, setSchema] = useState<ProgramApplicationSchema>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isUUID(appId)) return;
    (async () => {
      try {
        const app = await getApplication(appId!);
        setAppRow(app);
        const prog = await getProgramSchema(app.program_id);
        setSchema(prog?.application_schema ?? { fields: [] });
      } catch (e) {
        console.error("Error loading application:", e);
        navigate("/");
      }
    })();
  }, [appId, navigate]);

  const { answers, setAnswers } = useApplicationAutosave(
    appId!,
    appRow?.answers ?? {},
    appRow?.updated_at ?? undefined
  );

  const items = useMemo(() => schema.fields ?? [], [schema]);

  const update = (name: string, value: any) =>
    setAnswers((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async () => {
    if (!appRow || !isUUID(appId)) return;
    if (appRow.status !== "draft") {
      alert("Already submitted");
      return;
    }
    setSubmitting(true);
    try {
      await submitApplication(appId, answers);
      localStorage.removeItem(`app:${appId}:answers`);
      alert("Application submitted!");
      navigate("/");
    } catch (e: any) {
      alert(e.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isUUID(appId)) return null; // Guard against undefined ID
  if (!appRow || !schema) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {appRow.program_name ?? "Application"}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={submitting || appRow.status !== "draft"}
            title={appRow.status !== "draft" ? "Already submitted" : ""}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      <div className="rounded border bg-white p-4 space-y-4">
        {items.length === 0 ? (
          <div className="text-sm text-slate-500">
            This application doesn't include custom questions.
          </div>
        ) : (
          items.map((item, idx) => {
            const key = item.key || `q_${idx}`;
            const val = answers?.[key] ?? "";

            switch (item.type) {
              case "short_text":
                return (
                  <div key={key}>
                    <label className="block text-sm mb-1">
                      {item.label}
                      {item.required && " *"}
                    </label>
                    <input
                      className="w-full rounded border p-2"
                      value={val}
                      maxLength={item.maxLength}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </div>
                );
              case "long_text":
                return (
                  <div key={key}>
                    <label className="block text-sm mb-1">
                      {item.label}
                      {item.required && " *"}
                    </label>
                    <textarea
                      className="w-full rounded border p-2"
                      value={val}
                      maxLength={item.maxLength ?? 2000}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </div>
                );
              case "checkbox":
                return (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!val}
                      onChange={(e) => update(key, e.target.checked)}
                    />
                    <span>
                      {item.label}
                      {item.required && " *"}
                    </span>
                  </div>
                );
              case "date":
                return (
                  <div key={key}>
                    <label className="block text-sm mb-1">
                      {item.label}
                      {item.required && " *"}
                    </label>
                    <input
                      type="date"
                      className="w-full rounded border p-2"
                      value={val}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </div>
                );
              case "select":
                return (
                  <div key={key}>
                    <label className="block text-sm mb-1">
                      {item.label}
                      {item.required && " *"}
                    </label>
                    <select
                      className="w-full rounded border p-2"
                      value={val}
                      onChange={(e) => update(key, e.target.value)}
                    >
                      <option value="" disabled>
                        Select…
                      </option>
                      {(item.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              case "file":
                return (
                  <div key={key}>
                    <label className="block text-sm mb-1">
                      {item.label}
                      {item.required && " *"}
                    </label>
                    <input
                      type="file"
                      onChange={(e) =>
                        update(key, e.target.files?.[0]?.name ?? "")
                      }
                    />
                  </div>
                );
              default:
                return null;
            }
          })
        )}
      </div>

      {/* You can add submit-for-review / submit controls later */}
    </div>
  );
}
