import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getApplication, saveApplication } from "../../lib/rpc";
import { loadApplicationSchemaById } from "../../lib/schemaLoader";
import { missingRequired } from "../../utils/answers";
import { supabase } from "../../lib/supabase";
import { SimpleFileUpload } from "../../components/attachments/SimpleFileUpload";
import ProfileCard from "../../components/profile/ProfileCard";
import WordLimitedTextarea from "../../components/WordLimitedTextarea";
import {
  fetchProfileSnapshot,
  mergeProfileIntoAnswers,
  programUsesProfile,
  getRequiredProfileSections,
  validateProfileSections,
} from "../../lib/profileFill";

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
      maxWords?: number;
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

  const [app, setApp] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [programDetails, setProgramDetails] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [profileSnap, setProfileSnap] = useState<any>(null);

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

        // Load schema using centralized loader
        const schema = await loadApplicationSchemaById(data.program_id);
        console.log("🔍 ApplicationForm - Loaded schema:", schema);

        // Set program data with loaded schema
        setProgram({
          id: data.program_id,
          name: data.program_name || "Application",
          metadata: { form: { fields: schema.fields } },
        });

        // Load full program details and organization
        try {
          // Get program details from programs table (not programs_public) to get metadata
          const { data: programData, error: programError } = await supabase
            .from("programs")
            .select("id, name, description, organization_id, metadata")
            .eq("id", data.program_id)
            .single();

          if (!programError && programData) {
            setProgramDetails(programData);

            // Update program with full metadata including profile flags
            setProgram({
              id: programData.id,
              name: programData.name || "Application",
              metadata: {
                ...programData.metadata,
                form: {
                  ...programData.metadata?.form,
                  fields: schema.fields, // Preserve the loaded schema fields
                },
              },
            });

            // Load organization details
            const { data: orgData, error: orgError } = await supabase
              .from("organizations")
              .select("id, name")
              .eq("id", programData.organization_id)
              .single();

            if (!orgError && orgData) {
              setOrganization(orgData);
            }
          }
        } catch (e) {
          console.error("Failed to load program details:", e);
        }
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

  // Load profile snapshot when program uses profile autofill
  useEffect(() => {
    if (!program || !app) return;

    if (!programUsesProfile(program)) return;
    (async () => {
      // If application is submitted, use the snapshot from answers
      // If application is draft, use live profile data
      if (app.status === "submitted" && app.answers?.profile) {
        // Use the snapshot that was saved when submitted
        setProfileSnap(app.answers.profile);
        console.log("Using profile snapshot from submitted application");
      } else {
        // For draft applications, fetch live profile
        const profile = await fetchProfileSnapshot();
        setProfileSnap(profile);
        console.log("Using live profile data for draft application");
      }
    })();
  }, [program, app]);

  const fields: Field[] = useMemo(() => {
    const meta = (program?.metadata ?? {}) as ProgramMeta;
    return meta.form?.fields ?? [];
  }, [program]);

  async function onSave() {
    if (!applicationId) return;
    try {
      setSaving(true);
      setErr(null);
      // Don't merge profile data for draft saves - only save the actual form answers
      const updated = await saveApplication(applicationId, answers);
      setApp((r: any) => (r ? { ...r, ...updated } : (updated as any)));
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

    // Validate profile sections if program uses profile autofill
    if (programUsesProfile(program)) {
      const requiredSections = getRequiredProfileSections(program);
      const profileValidation = validateProfileSections(
        profileSnap,
        requiredSections
      );

      if (!profileValidation.isValid) {
        setErr(
          `Please complete the following required profile sections:\n${profileValidation.missingSections.join(
            "\n"
          )}`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      setErr(null);

      // For profile-enabled programs, take a fresh snapshot at submission time
      let finalAnswers = answers ?? {};
      if (programUsesProfile(program)) {
        // Fetch fresh profile data at submission time to capture any recent edits
        const freshProfile = await fetchProfileSnapshot();
        if (freshProfile) {
          finalAnswers = mergeProfileIntoAnswers(answers, freshProfile);
          console.log(
            "🔍 ApplicationForm - Taking fresh profile snapshot at submission time"
          );
        } else {
          console.warn(
            "🔍 ApplicationForm - Profile enabled but no profile data found"
          );
        }
      }

      const updated = await saveApplication(applicationId, finalAnswers);
      setApp((r: any) => (r ? { ...r, ...updated } : (updated as any)));
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
        <div>
          <h1 className="text-2xl font-bold">
            {programDetails?.name || program.name}
          </h1>
          {programDetails?.description && (
            <p className="mt-1 text-gray-600">{programDetails.description}</p>
          )}
          {organization && (
            <p className="mt-1 text-sm text-gray-500">
              Organization: {organization.name}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-3 py-2 border rounded-md text-sm"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Common App badges (for show, actual fields would be assembled server-side later) */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Includes</h2>
        <div className="flex gap-2 text-sm">
          {(program.metadata?.form?.include_common_app ?? false) && (
            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded">
              Omnipply Common App
            </span>
          )}
          {(program.metadata?.form?.include_coalition_common_app ?? false) && (
            <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded">
              Coalition Common App
            </span>
          )}
        </div>
      </div>

      {/* Profile Autofill Notice and Card */}
      {(() => {
        const shouldShow = programUsesProfile(program);
        return (
          shouldShow && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-900">
                      Profile Autofill Active
                    </span>
                  </div>
                  <a
                    href="/profile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Edit Profile →
                  </a>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  {app?.status === "submitted"
                    ? "Your profile information was included at submission time and is now locked."
                    : "Your profile information will be automatically included in this application."}
                </p>
              </div>

              {profileSnap ? (
                <div className="mb-4">
                  <ProfileCard
                    profile={profileSnap}
                    sectionSettings={
                      program?.metadata?.application?.profile?.sections
                    }
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      🔍 Debug: Profile autofill is enabled but no profile data
                      loaded yet. Check console for debugging info.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        );
      })()}

      {/* Dynamic fields */}
      <div className="space-y-6">
        {fields.length === 0 && (
          <div className="bg-white border rounded-lg p-6">
            <p className="text-sm text-gray-500">
              This program has no custom questions yet.
            </p>
          </div>
        )}

        {fields.map((f) => {
          const val = answers[f.id];
          const setVal = (v: any) => setAnswers((a) => ({ ...a, [f.id]: v }));

          switch (f.type) {
            case "short_text":
              return (
                <div
                  key={f.id}
                  className="bg-white border rounded-lg p-6 space-y-3"
                >
                  <label className="block text-sm font-medium text-gray-700">
                    {f.label}
                    {f.required && " *"}
                  </label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    type="text"
                    maxLength={f.maxLength}
                    value={val ?? ""}
                    onChange={(e) => setVal(e.target.value)}
                  />
                </div>
              );
            case "long_text":
              return (
                <div
                  key={f.id}
                  className="bg-white border rounded-lg p-6 space-y-3"
                >
                  <WordLimitedTextarea
                    label={f.label}
                    value={val ?? ""}
                    onChange={setVal}
                    maxWords={f.maxWords ?? 100}
                    rows={5}
                    required={f.required}
                  />
                </div>
              );
            case "date":
              return (
                <div
                  key={f.id}
                  className="bg-white border rounded-lg p-6 space-y-3"
                >
                  <label className="block text-sm font-medium text-gray-700">
                    {f.label}
                    {f.required && " *"}
                  </label>
                  <input
                    className="rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    type="date"
                    value={val ?? ""}
                    onChange={(e) => setVal(e.target.value)}
                  />
                </div>
              );
            case "select":
              return (
                <div
                  key={f.id}
                  className="bg-white border rounded-lg p-6 space-y-3"
                >
                  <label className="block text-sm font-medium text-gray-700">
                    {f.label}
                    {f.required && " *"}
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={val ?? ""}
                    onChange={(e) => setVal(e.target.value)}
                  >
                    <option value="">Select an option...</option>
                    {f.options?.map((option, index) => (
                      <option key={index} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              );
            case "checkbox":
              return (
                <div key={f.id} className="bg-white border rounded-lg p-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      checked={!!val}
                      onChange={(e) => setVal(e.target.checked)}
                    />
                    <label className="text-sm font-medium text-gray-700">
                      {f.label}
                      {f.required && " *"}
                    </label>
                  </div>
                </div>
              );
            case "file":
              return (
                <div
                  key={f.id}
                  className="bg-white border rounded-lg p-6 space-y-3"
                >
                  <label className="block text-sm font-medium text-gray-700">
                    {f.label}
                    {f.required && " *"}
                  </label>
                  <SimpleFileUpload
                    applicationId={applicationId}
                    fieldId={f.id}
                    value={answers[f.id] || ""}
                    onChange={(value) =>
                      setAnswers((prev) => ({ ...prev, [f.id]: value }))
                    }
                  />
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
