import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { isUUID } from "../../lib/id";
import {
  saveBuilderSchema,
  orgSubmitProgramForReview,
  type ProgramApplicationDraft,
  getCoalitionTemplate,
} from "../../lib/programs";
import type {
  ProgramApplicationSchema,
  AppItem,
} from "../../types/application";
import OptionsInput from "../../components/OptionsInput";
import ApplicationPreview from "../../components/ApplicationPreview";

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

type Coalition = { id: string; slug: string; name: string };

export default function CoalitionProgramBuilder() {
  const { coalitionSlug, programId } = useParams<{
    coalitionSlug: string;
    programId: string;
  }>();
  const navigate = useNavigate();

  const [coalition, setCoalition] = useState<Coalition | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [includeApplyHubCommon, setIncludeApplyHubCommon] =
    useState<boolean>(true);
  const [includeCoalitionCommon, setIncludeCoalitionCommon] =
    useState<boolean>(false);
  const [fields, setFields] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // load coalition
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("coalitions")
        .select("id,slug,name")
        .eq("slug", coalitionSlug)
        .single();
      if (error || !data) return navigate("/unauthorized");
      setCoalition(data);
    })();
  }, [coalitionSlug, navigate]);

  // load program
  useEffect(() => {
    if (!isUUID(programId)) return; // Guard against undefined ID
    (async () => {
      const { data, error } = await supabase.rpc("cm_get_program_v1", {
        p_program_id: programId,
      });

      // Supabase returns a setof row => array
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        return navigate("/unauthorized");
      }

      const row = Array.isArray(data) ? data[0] : data;
      setProgram(row);

      const appMeta = row.metadata?.application || {};
      setIncludeApplyHubCommon(!!appMeta?.common?.applyhub);
      setIncludeCoalitionCommon(!!appMeta?.common?.coalition);
      setFields(Array.isArray(appMeta?.builder) ? appMeta.builder : []);
    })();
  }, [programId, navigate]);

  // simple field add helper
  function addField(type: AppItem["type"]) {
    const label = type
      .replace("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    setFields((f) => [...f, { type, label, required: false }]);
  }

  async function onSave() {
    if (!program || !isUUID(programId)) return; // Guard against undefined ID
    setSaving(true);
    setMsg(null);
    try {
      await saveBuilderSchema(program.id, {
        common: {
          applyhub: includeApplyHubCommon,
          coalition: includeCoalitionCommon,
        },
        builder: fields,
      });
      setMsg("Saved.");
    } catch (e: any) {
      setMsg(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitForReview() {
    if (!program || !coalition || !isUUID(programId)) return; // Guard against undefined ID
    setSaving(true);
    setMsg(null);
    try {
      // First, save any current changes to the schema
      const updatedSchema = {
        fields: fields,
      };
      console.log("Saving schema before submission:", updatedSchema);
      await setBuilderSchema(programId, updatedSchema);
      console.log("Schema saved before submission");

      // If program is already submitted, we need to reset it to draft first
      const meta = (program?.metadata ?? {}) as any;
      const currentStatus =
        typeof meta?.review_status === "string" ? meta.review_status : "draft";

      if (currentStatus === "submitted") {
        // Reset to draft first by updating metadata
        const { error: updateError } = await supabase
          .from("programs")
          .update({
            metadata: {
              ...meta,
              review_status: "draft",
            },
          })
          .eq("id", program.id);

        if (updateError) throw new Error(updateError.message);
      }

      await orgSubmitProgramForReview({
        program_id: program.id,
        note: isSubmitted
          ? "Coalition manager resubmitted for review"
          : "Coalition manager submitted for review",
      });
      setMsg(
        isSubmitted
          ? "Resubmitted for review. Superadmin will review & publish."
          : "Submitted for review. Superadmin will review & publish."
      );
      // Navigate back to programs list after successful submission
      setTimeout(() => {
        navigate(`/coalition/${coalitionSlug}/admin/programs`);
      }, 1500);
    } catch (e: any) {
      setMsg(e.message || "Request failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!isUUID(programId)) return null; // Guard against undefined ID
  if (!coalition || !program) return <div>Loading...</div>;

  // Check if form should be disabled (when status is submitted)
  const meta = (program?.metadata ?? {}) as any;
  const status =
    typeof meta?.review_status === "string" ? meta.review_status : "draft";
  const isSubmitted = status === "submitted";
  const isDisabled = isSubmitted && !isEditing;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {coalition.name} — Edit Application
            </h1>
            <p className="text-sm text-gray-500">Program: {program.name}</p>
          </div>
          <Link
            to={`/coalition/${coalition.slug}/cm/programs`}
            className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
          >
            Back to Programs
          </Link>
        </div>
      </div>

      {/* Review note for coalition managers */}
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

      {/* Disabled state notice for submitted programs */}
      {(() => {
        const meta = (program?.metadata ?? {}) as any;
        const status =
          typeof meta?.review_status === "string"
            ? meta.review_status
            : "draft";
        if (status === "submitted") {
          return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      Program submitted for review
                    </div>
                    <div className="text-sm">
                      This program has been submitted and is awaiting review.
                      You can view and edit the form as needed.
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="ml-4 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    {isEditing ? "Cancel Edit" : "Edit"}
                  </button>
                </div>
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
                disabled={isDisabled}
              />
              <span>Include Apply-Hub Common App</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={includeCoalitionCommon}
                onChange={(e) => setIncludeCoalitionCommon(e.target.checked)}
                disabled={isDisabled}
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
                className="px-3 py-1.5 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDisabled}
              >
                Short text
              </button>
              <button
                onClick={() => addField("long_text")}
                className="px-3 py-1.5 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDisabled}
              >
                Long text
              </button>
              <button
                onClick={() => addField("date")}
                className="px-3 py-1.5 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDisabled}
              >
                Date
              </button>
              <button
                onClick={() => addField("select")}
                className="px-3 py-1.5 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDisabled}
              >
                Select
              </button>
              <button
                onClick={() => addField("checkbox")}
                className="px-3 py-1.5 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDisabled}
              >
                Checkbox
              </button>
              <button
                onClick={() => addField("file")}
                className="px-3 py-1.5 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDisabled}
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
                    className="border rounded px-3 py-2 w-80 disabled:opacity-50 disabled:bg-gray-100"
                    value={field.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFields((f) => {
                        const newFields = [...f];
                        newFields[idx] = { ...newFields[idx], label: v };
                        return newFields;
                      });
                    }}
                    disabled={isDisabled}
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
                      disabled={isDisabled}
                    />
                    Required
                  </label>
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
                    className="ml-auto text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() =>
                      setFields((f) => f.filter((_, i) => i !== idx))
                    }
                    disabled={isDisabled}
                  >
                    Remove
                  </button>
                </div>
                {field.type === "select" && (
                  <OptionsInput
                    options={field.options ?? []}
                    onChange={(options) => {
                      setFields((f) => {
                        const newFields = [...f];
                        newFields[idx] = { ...newFields[idx], options };
                        return newFields;
                      });
                    }}
                    disabled={isDisabled}
                  />
                )}
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
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Preview Application
            </button>
            <button
              disabled={saving || isDisabled}
              onClick={onSave}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              disabled={saving || (isSubmitted && !isEditing)}
              onClick={onSubmitForReview}
              className="px-4 py-2 rounded border border-indigo-600 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
            >
              {isSubmitted ? "Resubmit for review" : "Submit for review"}
            </button>
            {msg && <span className="text-sm text-gray-600 ml-2">{msg}</span>}
          </div>
        </div>
      </div>

      <ApplicationPreview
        fields={fields}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}
