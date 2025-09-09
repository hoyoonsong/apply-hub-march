import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  getBuilderSchema,
  setBuilderSchema,
  type ApplicationSchema,
} from "../../data/api";
import {
  submitForReview,
  type ProgramApplicationDraft,
  getCoalitionTemplate,
} from "../../lib/programs";
import type {
  ProgramApplicationSchema,
  AppItem,
} from "../../types/application";

type Program = {
  id: string;
  name: string;
  description: string | null;
  metadata: any;
  organization_id: string;
  published: boolean;
  published_scope: string | null;
  published_coalition_id: string | null;
};

type Org = { id: string; slug: string; name: string };

export default function OrgProgramBuilder() {
  const params = useParams();
  const navigate = useNavigate();
  const orgSlug = useMemo(() => (params?.orgSlug as string) || "", [params]);
  const programId = useMemo(
    () => (params?.programId as string) || "",
    [params]
  );

  const [org, setOrg] = useState<Org | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [includeApplyHubCommon, setIncludeApplyHubCommon] =
    useState<boolean>(true);
  const [includeCoalitionCommon, setIncludeCoalitionCommon] =
    useState<boolean>(false);
  const [fields, setFields] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [schema, setSchema] = useState<ApplicationSchema>({ fields: [] });
  const [loading, setLoading] = useState(true);

  // load org
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id,slug,name")
        .eq("slug", orgSlug)
        .single();
      if (error || !data) return navigate("/unauthorized");
      setOrg(data);
    })();
  }, [orgSlug, navigate]);

  // load program and schema
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!programId) return;
      try {
        // Load program details
        const { data, error } = await supabase.rpc("org_get_program_v1", {
          p_program_id: programId,
        });

        if (error || !data || (Array.isArray(data) && data.length === 0)) {
          return navigate("/unauthorized");
        }

        const row = Array.isArray(data) ? data[0] : data;
        if (mounted) {
          setProgram(row);

          const appMeta = row.metadata?.application || {};
          setIncludeApplyHubCommon(!!appMeta?.common?.applyhub);
          setIncludeCoalitionCommon(!!appMeta?.common?.coalition);
        }

        // Load builder schema separately
        try {
          const s = await getBuilderSchema(programId);
          if (mounted) {
            setSchema(s ?? { fields: [] });
            setFields(s?.fields || []);
          }
        } catch (e) {
          // First time - no schema exists yet
          if (mounted) {
            setSchema({ fields: [] });
            setFields([]);
          }
        }
      } catch (e: any) {
        if (mounted) {
          console.error("Failed to load program:", e);
          navigate("/unauthorized");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [programId, navigate]);

  // simple field add helper
  function addField(type: AppItem["type"]) {
    const label = type
      .replace("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const key = `${type}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newFields = [...fields, { type, label, key, required: false }];
    setFields(newFields);
    setSchema({ fields: newFields });
  }

  async function onSave() {
    if (!programId) return;
    setSaving(true);
    setMsg(null);
    try {
      // Update the schema with current fields
      const updatedSchema = {
        fields: fields,
      };

      console.log("Saving schema:", updatedSchema);
      const saved = await setBuilderSchema(programId, updatedSchema);
      console.log("Saved schema result:", saved);
      setSchema(saved ?? updatedSchema);
      setMsg("Saved.");
    } catch (e: any) {
      console.error("Save error:", e);
      setMsg(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitForReview() {
    if (!program || !programId) return;
    setSaving(true);
    setMsg(null);
    try {
      await submitForReview(
        program.id,
        "org",
        undefined,
        "Org admin submitted for review"
      );
      setMsg("Submitted for review. Superadmin will review & publish.");
    } catch (e: any) {
      setMsg(e.message || "Request failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!programId) return <div className="p-6">Loading…</div>;
  if (loading) return <div className="p-6">Loading builder…</div>;
  if (!org) return <div className="p-6">Loading organization…</div>;
  if (!program) return <div className="p-6">Loading program…</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {org.name} — Edit Application
            </h1>
            <p className="text-sm text-gray-500">Program: {program.name}</p>
          </div>
          <Link
            to={`/org/${org.slug}/admin/programs`}
            className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
          >
            Back to Programs
          </Link>
        </div>
      </div>

      {/* Review note for org admins */}
      {(() => {
        const meta = (program?.metadata ?? {}) as any;
        const status =
          typeof meta?.review_status === "string"
            ? meta.review_status
            : "draft";
        const note =
          typeof meta?.review_note === "string" ? meta.review_note : null;
        if (status === "changes_requested" && note) {
          return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
                <div className="font-semibold">Changes requested</div>
                <div className="text-sm whitespace-pre-wrap">{note}</div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="max-w-6xl mx-auto mt-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Toggles */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">
            Common Application Options
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={includeApplyHubCommon}
                onChange={(e) => setIncludeApplyHubCommon(e.target.checked)}
              />
              <span>Include Apply-Hub Common App</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={includeCoalitionCommon}
                onChange={(e) => setIncludeCoalitionCommon(e.target.checked)}
              />
              <span>Include Coalition Common App (if available)</span>
            </label>
          </div>
        </div>

        {/* Builder */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Application Builder</h2>
            <div className="flex gap-2">
              <button
                onClick={() => addField("short_text")}
                className="px-3 py-1.5 border rounded"
              >
                Short text
              </button>
              <button
                onClick={() => addField("long_text")}
                className="px-3 py-1.5 border rounded"
              >
                Long text
              </button>
              <button
                onClick={() => addField("date")}
                className="px-3 py-1.5 border rounded"
              >
                Date
              </button>
              <button
                onClick={() => addField("select")}
                className="px-3 py-1.5 border rounded"
              >
                Select
              </button>
              <button
                onClick={() => addField("checkbox")}
                className="px-3 py-1.5 border rounded"
              >
                Checkbox
              </button>
              <button
                onClick={() => addField("file")}
                className="px-3 py-1.5 border rounded"
              >
                File upload
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {fields.map((field, idx) => (
              <div key={idx} className="border rounded p-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <span className="text-xs uppercase tracking-wide bg-gray-100 px-2 py-1 rounded">
                    {field.type}
                  </span>
                  <input
                    className="border rounded px-3 py-2 w-80"
                    value={field.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFields((f) => {
                        const newFields = [...f];
                        newFields[idx] = { ...newFields[idx], label: v };
                        return newFields;
                      });
                    }}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!field.required}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setFields((f) => {
                          const newFields = [...f];
                          newFields[idx] = { ...newFields[idx], required: v };
                          return newFields;
                        });
                      }}
                    />
                    Required
                  </label>
                  {field.type === "select" && (
                    <input
                      className="border rounded px-3 py-2 w-96"
                      placeholder="Options comma-separated"
                      value={(field.options ?? []).join(",")}
                      onChange={(e) => {
                        const arr = e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        setFields((f) => {
                          const newFields = [...f];
                          newFields[idx] = { ...newFields[idx], options: arr };
                          return newFields;
                        });
                      }}
                    />
                  )}
                  {field.type === "long_text" && (
                    <input
                      className="border rounded px-3 py-2 w-52"
                      type="number"
                      placeholder="Max length"
                      value={field.maxLength ?? ""}
                      onChange={(e) => {
                        const val = e.target.value
                          ? Number(e.target.value)
                          : undefined;
                        setFields((f) => {
                          const newFields = [...f];
                          newFields[idx] = {
                            ...newFields[idx],
                            maxLength: val,
                          };
                          return newFields;
                        });
                      }}
                    />
                  )}
                  <button
                    className="ml-auto text-red-600 hover:text-red-700"
                    onClick={() =>
                      setFields((f) => f.filter((_, i) => i !== idx))
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {fields.length === 0 && (
              <p className="text-sm text-gray-500">
                No fields yet. Add fields above.
              </p>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              disabled={saving}
              onClick={onSave}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              disabled={saving}
              onClick={onSubmitForReview}
              className="px-4 py-2 rounded border border-indigo-600 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
            >
              Submit for review
            </button>
            {msg && <span className="text-sm text-gray-600 ml-2">{msg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
