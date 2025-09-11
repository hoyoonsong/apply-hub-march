import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getApplication, saveApplication } from "../../lib/rpc";
import { missingRequired } from "../../utils/answers";

/**
 * We expect the program builder to have saved metadata like:
 * {
 *   form: {
 *     include_common_app: boolean,
 *     include_coalition_common_app: boolean,
 *     fields: [
 *       { id: 'q1', type: 'short_text' | 'long_text' | 'date' | 'select' | 'checkbox' | 'file',
 *         label: 'This is a short text query', required: true, options?: string[] , maxLength?: number }
 *     ]
 *   }
 * }
 *
 * If your builder uses a slightly different shape, tweak the accessors below.
 */

type Field =
  | {
      id: string;
      type: "short_text";
      label: string;
      required?: boolean;
      maxLength?: number;
    }
  | {
      id: string;
      type: "long_text";
      label: string;
      required?: boolean;
      maxLength?: number;
    }
  | { id: string; type: "date"; label: string; required?: boolean }
  | {
      id: string;
      type: "select";
      label: string;
      required?: boolean;
      options: string[];
    }
  | { id: string; type: "checkbox"; label: string; required?: boolean }
  | { id: string; type: "file"; label: string; required?: boolean };

type ProgramMeta = {
  form?: {
    include_common_app?: boolean;
    include_coalition_common_app?: boolean;
    fields?: Field[];
  };
};

export default function ApplicationForm() {
  const params = useParams();
  const navigate = useNavigate();
  const applicationId = useMemo(() => (params?.id as string) || "", [params]);

  const [app, setApp] = useState<AppRow | null>(null);
  const [program, setProgram] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Load app and program meta
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!applicationId) return;
        const data = await getApplication(applicationId);
        if (!mounted) return;
        setApp(data);
        setAnswers(data.answers ?? {});

        // Extract fields from the application schema
        let fields = [];
        if (data.application_schema) {
          if (Array.isArray(data.application_schema)) {
            fields = data.application_schema;
          } else if (
            data.application_schema.fields &&
            Array.isArray(data.application_schema.fields)
          ) {
            fields = data.application_schema.fields;
          } else if (
            data.application_schema.builder &&
            Array.isArray(data.application_schema.builder)
          ) {
            fields = data.application_schema.builder;
          }
        }

        // Set program data from application_schema
        setProgram({
          id: data.program_id,
          name: "Application",
          metadata: { form: { fields } },
        });
      } catch (e: any) {
        if (!mounted) return;
        if (e.message?.includes("Not authorized or application not found")) {
          navigate("/unauthorized");
          return;
        }
        setErr(e.message ?? "Failed to load application");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [applicationId, navigate]);

  const fields: Field[] = useMemo(() => {
    const meta = (program?.metadata ?? {}) as ProgramMeta;
    return meta.form?.fields ?? [];
  }, [program]);

  async function onSave() {
    if (!applicationId) return;
    try {
      setSaving(true);
      setErr(null);
      const updated = await saveApplication(applicationId, answers);
      setApp((r) => (r ? { ...r, ...updated } : (updated as any)));
    } catch (e: any) {
      setErr(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitApp() {
    if (!applicationId) return;

    // Validate required fields before submitting
    const fields = (program?.metadata as any)?.form?.fields || [];
    const schema = {
      fields: fields.map((f: any) => ({
        key: f.id,
        label: f.label,
        required: f.required,
        type: f.type,
      })),
    };
    const missing = missingRequired(schema, answers);
    if (missing.length > 0) {
      setErr(
        `Please complete the following required fields: ${missing.join(", ")}`
      );
      return;
    }

    setSubmitting(true);
    try {
      setErr(null);
      const updated = await saveApplication(applicationId, answers);
      setApp((r) => (r ? { ...r, ...updated } : (updated as any)));
      alert("Application submitted!");
      // Navigate back to the program
      navigate("/");
    } catch (e: any) {
      setErr(e.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!applicationId) return <div className="p-6">Loading…</div>;

  if (err) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-600">{err}</p>
      </div>
    );
  }
  if (!app) return <div className="p-6">Loading application…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{program.name} — Application</h1>
        <button
          onClick={() => navigate("/")}
          className="px-3 py-2 border rounded-md text-sm"
        >
          Back to Home
        </button>
      </div>

      {/* Common App badges (for show, actual fields would be assembled server-side later) */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Includes</h2>
        <div className="flex gap-2 text-sm">
          {(program.metadata?.form?.include_common_app ?? false) && (
            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded">
              Apply-Hub Common App
            </span>
          )}
          {(program.metadata?.form?.include_coalition_common_app ?? false) && (
            <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded">
              Coalition Common App
            </span>
          )}
        </div>
      </div>

      {/* Dynamic fields */}
      <div className="bg-white border rounded-lg p-4 space-y-4">
        {fields.length === 0 && (
          <p className="text-sm text-gray-500">
            This program has no custom questions yet.
          </p>
        )}

        {fields.map((f) => {
          const val = answers[f.id];
          const setVal = (v: any) => setAnswers((a) => ({ ...a, [f.id]: v }));

          switch (f.type) {
            case "short_text":
              return (
                <div key={f.id} className="space-y-1">
                  <label className="block text-sm font-medium">
                    {f.label}
                    {f.required && " *"}
                  </label>
                  <input
                    className="w-full rounded-md border px-3 py-2"
                    type="text"
                    maxLength={f.maxLength}
                    value={val ?? ""}
                    onChange={(e) => setVal(e.target.value)}
                  />
                </div>
              );
            case "long_text":
              return (
                <div key={f.id} className="space-y-1">
                  <label className="block text-sm font-medium">
                    {f.label}
                    {f.required && " *"}
                  </label>
                  <textarea
                    className="w-full rounded-md border px-3 py-2"
                    rows={5}
                    maxLength={f.maxLength}
                    value={val ?? ""}
                    onChange={(e) => setVal(e.target.value)}
                  />
                </div>
              );
            case "date":
              return (
                <div key={f.id} className="space-y-1">
                  <label className="block text-sm font-medium">
                    {f.label}
                    {f.required && " *"}
                  </label>
                  <input
                    className="rounded-md border px-3 py-2"
                    type="date"
                    value={val ?? ""}
                    onChange={(e) => setVal(e.target.value)}
                  />
                </div>
              );
            case "select":
              return (
                <div key={f.id} className="space-y-1">
                  <label className="block text-sm font-medium">
                    {f.label}
                    {f.required && " *"}
                  </label>
                  <input
                    className="w-full rounded-md border px-3 py-2"
                    placeholder="Comma-separated options (temporary UI)"
                    value={val ?? f.options?.join(", ") ?? ""}
                    onChange={(e) => setVal(e.target.value)}
                  />
                  {/* For now a simple text input; swap for a real <select> once builder saves options[] */}
                </div>
              );
            case "checkbox":
              return (
                <div key={f.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!!val}
                    onChange={(e) => setVal(e.target.checked)}
                  />
                  <label className="text-sm">
                    {f.label}
                    {f.required && " *"}
                  </label>
                </div>
              );
            case "file":
              return (
                <div key={f.id} className="space-y-1">
                  <label className="block text-sm font-medium">
                    {f.label}
                    {f.required && " *"}
                  </label>
                  <input
                    type="file"
                    className="block w-full text-sm"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      // TODO: wire Supabase Storage + return URL; for now, store filename
                      if (file) setVal({ name: file.name });
                    }}
                  />
                  {val?.name && (
                    <p className="text-xs text-gray-500">
                      Attached: {val.name}
                    </p>
                  )}
                </div>
              );
            default:
              return null;
          }
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving || submitting}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onSubmitApp}
          disabled={saving || submitting}
          className="ml-3 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit Application"}
        </button>
      </div>
    </div>
  );
}
