import * as React from "react";
import { supabase } from "@/lib/supabase-browser";
import type {
  ApplicationRow,
  ApplicationSchema,
  Answers,
} from "@/types/application";
import { reconcileAnswers, missingRequired } from "@/utils/answers";
import { useParams, useNavigate } from "react-router-dom";

export default function ApplicationPage() {
  const params = useParams();
  const navigate = useNavigate();
  const appId = typeof params?.id === "string" ? params.id : undefined;

  const [app, setApp] = React.useState<ApplicationRow | null>(null);
  const [schema, setSchema] = React.useState<ApplicationSchema | null>(null);
  const [answers, setAnswers] = React.useState<Answers>({});
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load application (owner-only via RPC) and program schema
  React.useEffect(() => {
    if (!appId) return;
    (async () => {
      setLoading(true);
      setError(null);

      // 1) app row (has program_id and answers)
      const { data: appRow, error: appErr } = await supabase.rpc(
        "app_get_application_v1",
        {
          p_application_id: appId,
        }
      );
      if (appErr || !appRow) {
        setError(appErr?.message || "Not authorized or application not found");
        setLoading(false);
        return;
      }
      const typedApp = appRow as ApplicationRow;
      setApp(typedApp);

      // 2) program schema
      const { data: program, error: progErr } = await supabase
        .from("programs_public")
        .select("id, application_schema")
        .eq("id", typedApp.program_id)
        .maybeSingle();

      if (progErr) setError(progErr.message);
      const schema = (program?.application_schema as ApplicationSchema) || {
        fields: [],
      };
      setSchema(schema);

      // 3) reconcile answers
      setAnswers(reconcileAnswers(schema, typedApp.answers));

      setLoading(false);
    })();
  }, [appId]);

  const updateField = (key: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const saveDraft = async () => {
    if (!app) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("app_save_application_v1", {
      p_application_id: app.id,
      p_answers: answers,
    });
    setSaving(false);
    if (error) return setError(error.message);
    setApp(data as ApplicationRow);
  };

  const submit = async () => {
    if (!app || !schema) return;
    const missing = missingRequired(schema, answers);
    if (missing.length) {
      setError(`Missing required: ${missing.join(", ")}`);
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("app_submit_application_v1", {
      p_application_id: app.id,
      p_answers: answers,
    });
    setSubmitting(false);
    if (error) return setError(error.message);
    setApp(data as ApplicationRow);
  };

  if (!appId) return null;
  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!app || !schema) return null;

  return (
    <div className="container">
      <header style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <h1>Application</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={saveDraft}
            disabled={saving || app.status === "submitted"}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={submit}
            disabled={submitting || app.status === "submitted"}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </header>

      {schema.fields.length === 0 && (
        <div className="card">
          This application doesn't include custom questions.
        </div>
      )}

      {schema.fields.map((f) => (
        <div key={f.key} className="field">
          <label style={{ display: "block", fontWeight: 600 }}>
            {f.label} {f.required ? "*" : ""}
          </label>

          {f.type === "SHORT_TEXT" && (
            <input
              type="text"
              value={answers[f.key] ?? ""}
              onChange={(e) => updateField(f.key, e.target.value)}
            />
          )}

          {f.type === "LONG_TEXT" && (
            <textarea
              value={answers[f.key] ?? ""}
              maxLength={f.maxLength || undefined}
              onChange={(e) => updateField(f.key, e.target.value)}
            />
          )}

          {f.type === "DATE" && (
            <input
              type="date"
              value={(answers[f.key] as string) || ""}
              onChange={(e) => updateField(f.key, e.target.value || null)}
            />
          )}

          {f.type === "SELECT" && (
            <select
              value={answers[f.key] ?? ""}
              onChange={(e) => updateField(f.key, e.target.value || null)}
            >
              <option value="">Select…</option>
              {(f.options || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {f.type === "CHECKBOX" && (
            <input
              type="checkbox"
              checked={!!answers[f.key]}
              onChange={(e) => updateField(f.key, e.target.checked)}
            />
          )}

          {f.type === "FILE" && (
            <>
              <input
                type="file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  // TODO: Wire to your storage upload and set storage path/URL:
                  // const { data, error } = await supabase.storage.from('files').upload(...);
                  // updateField(f.key, data?.path ?? null);
                  updateField(f.key, file.name); // placeholder
                }}
              />
              {answers[f.key] && <small>Saved: {String(answers[f.key])}</small>}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
