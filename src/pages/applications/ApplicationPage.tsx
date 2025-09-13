import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isUUID } from "../../lib/id";
import {
  getApplication,
  getProgramSchema,
  submitApplication,
  saveApplication,
} from "../../lib/rpc";
import { useApplicationAutosave } from "../../components/useApplicationAutosave";
import { SimpleFileUpload } from "../../components/attachments/SimpleFileUpload";
import { AttachmentList } from "../../components/attachments/AttachmentList";
import type { ProgramApplicationSchema } from "../../types/application";
import { missingRequired } from "../../utils/answers";
import {
  isPastDeadline,
  isBeforeOpenDate,
  isApplicationOpen,
  getDeadlineMessage,
  getOpenDateMessage,
} from "../../lib/deadlineUtils";
import { supabase } from "../../lib/supabase";

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
  const [programDeadline, setProgramDeadline] = useState<string | null>(null);
  const [programOpenDate, setProgramOpenDate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [programDetails, setProgramDetails] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);

  useEffect(() => {
    if (!isUUID(appId)) return;
    (async () => {
      try {
        const app = await getApplication(appId!);
        setAppRow(app);
        const prog = await getProgramSchema(app.program_id);
        console.log("Program data:", prog);
        console.log("Open at:", prog?.open_at);
        console.log("Close at:", prog?.close_at);
        setSchema(prog?.application_schema ?? { fields: [] });
        setProgramDeadline(prog?.close_at || null);
        setProgramOpenDate(prog?.open_at || null);

        // Set editing mode: draft apps are editable, submitted apps are read-only by default
        setIsEditing(app.status === "draft");

        // Load full program details and organization
        try {
          // Get program details from programs_public table
          const { data: programData, error: programError } = await supabase
            .from("programs_public")
            .select("id, name, description, organization_id")
            .eq("id", app.program_id)
            .single();

          if (!programError && programData) {
            setProgramDetails(programData);

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

  // Update answers when appRow changes (e.g., after submission)
  useEffect(() => {
    if (appRow?.answers) {
      setAnswers(appRow.answers);
    }
  }, [appRow?.answers, setAnswers]);

  const items = useMemo(() => schema.fields ?? [], [schema]);

  // Check if application is currently open (between open and close dates)
  const isOpen = isApplicationOpen(programOpenDate, programDeadline);
  const isBeforeOpen = isBeforeOpenDate(programOpenDate);
  const isPastDeadlineFlag = isPastDeadline(programDeadline);

  // Check if editing is allowed (application is open and not past deadline)
  const canEdit = isOpen && !isPastDeadlineFlag;
  const isFormEditable = canEdit && isEditing;

  const update = (name: string, value: any) => {
    if (!isFormEditable) return; // Don't allow updates if not in edit mode
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!appRow || !isUUID(appId)) return;
    if (!canEdit) {
      if (isBeforeOpen) {
        alert("Cannot submit - application has not opened yet");
      } else if (isPastDeadlineFlag) {
        alert("Cannot submit - deadline has passed");
      } else {
        alert("Cannot submit - application is not currently open");
      }
      return;
    }

    // Validate required fields before submitting
    if (schema) {
      const missing = missingRequired(schema, answers);
      if (missing.length > 0) {
        alert(
          `Please complete the following required fields: ${missing.join(", ")}`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      if (appRow.status === "draft") {
        // First time submitting
        await submitApplication(appId, answers);
        // Reload application data to get updated status and answers
        const updatedApp = await getApplication(appId);
        setAppRow(updatedApp);
        // Clear localStorage after successful submission
        localStorage.removeItem(`app:${appId}:answers`);
        alert("Application submitted!");
        navigate("/");
      } else if (appRow.status === "submitted" && isEditing) {
        // Saving changes to already submitted application
        await saveApplication(appId, answers);
        // Reload application data to get updated answers
        const updatedApp = await getApplication(appId);
        setAppRow(updatedApp);
        setIsEditing(false); // Exit edit mode and lock fields
        alert("Changes saved!");
      }
    } catch (e: any) {
      alert(e.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isUUID(appId)) return null; // Guard against undefined ID
  if (!appRow || !schema) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {programDetails?.name || appRow.program_name || "Application"}
              </h1>
              {programDetails?.description && (
                <p className="mt-1 text-gray-600">
                  {programDetails.description}
                </p>
              )}
              {organization && (
                <p className="mt-1 text-sm text-gray-500">
                  Organization: {organization.name}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <span>←</span>
                Back to Home
              </button>
              {/* Show Edit Application button only for submitted apps that can still be edited */}
              {appRow.status === "submitted" && canEdit && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700"
                >
                  Edit Application
                </button>
              )}

              {/* Show Cancel button only when editing submitted apps */}
              {isEditing && appRow.status === "submitted" && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Application Card */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6">
            {/* Application Status */}
            <div
              className={`rounded-lg border p-4 ${
                canEdit
                  ? "bg-blue-50 border-blue-200"
                  : isBeforeOpen
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {canEdit ? "📅" : isBeforeOpen ? "⏰" : "🔒"}
                </span>
                <div>
                  <div className="font-semibold text-gray-900">
                    {canEdit
                      ? "Application Open"
                      : isBeforeOpen
                      ? "Application Coming Soon"
                      : "Application Closed"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {isBeforeOpen
                      ? getOpenDateMessage(programOpenDate)
                      : programDeadline
                      ? getDeadlineMessage(programDeadline)
                      : "No deadline set"}
                  </div>
                  {appRow.status === "submitted" && canEdit && (
                    <div className="text-sm text-green-600 mt-1">
                      ✓ Application submitted - You can still edit until the
                      deadline
                    </div>
                  )}
                  {isBeforeOpen && (
                    <div className="text-sm text-yellow-600 mt-1">
                      Application will be available soon
                    </div>
                  )}
                  {!canEdit && !isBeforeOpen && (
                    <div className="text-sm text-red-600 mt-1">
                      Application is locked - deadline has passed
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Only show form if application is open or past deadline (for viewing submitted apps) */}
            {!isBeforeOpen && (
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
                              className={`w-full rounded border p-2 ${
                                !isFormEditable
                                  ? "opacity-70 bg-gray-100 border-gray-300 text-gray-500"
                                  : ""
                              }`}
                              value={val}
                              maxLength={item.maxLength}
                              onChange={(e) => update(key, e.target.value)}
                              disabled={!isFormEditable}
                              readOnly={!isFormEditable}
                              style={{
                                cursor: isFormEditable ? "text" : "not-allowed",
                              }}
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
                              className={`w-full rounded border p-2 ${
                                !isFormEditable
                                  ? "opacity-70 bg-gray-100 border-gray-300 text-gray-500"
                                  : ""
                              }`}
                              value={val}
                              maxLength={item.maxLength ?? 2000}
                              onChange={(e) => update(key, e.target.value)}
                              disabled={!isFormEditable}
                              readOnly={!isFormEditable}
                              style={{
                                cursor: isFormEditable ? "text" : "not-allowed",
                              }}
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
                              disabled={!isFormEditable}
                              className={!isFormEditable ? "opacity-50" : ""}
                              style={{
                                cursor: isFormEditable
                                  ? "pointer"
                                  : "not-allowed",
                              }}
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
                              className={`w-full rounded border p-2 ${
                                !isFormEditable
                                  ? "opacity-70 bg-gray-100 border-gray-300 text-gray-500"
                                  : ""
                              }`}
                              value={val}
                              onChange={(e) => update(key, e.target.value)}
                              disabled={!isFormEditable}
                              readOnly={!isFormEditable}
                              style={{
                                cursor: isFormEditable ? "text" : "not-allowed",
                              }}
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
                              className={`w-full rounded border p-2 ${
                                !isFormEditable
                                  ? "opacity-70 bg-gray-100 border-gray-300 text-gray-500"
                                  : ""
                              }`}
                              value={val}
                              onChange={(e) => update(key, e.target.value)}
                              disabled={!isFormEditable}
                              style={{
                                cursor: isFormEditable
                                  ? "pointer"
                                  : "not-allowed",
                              }}
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
                            <SimpleFileUpload
                              applicationId={appId!}
                              fieldId={key}
                              value={answers[key] || ""}
                              onChange={(value) => update(key, value)}
                              disabled={!isFormEditable}
                            />
                          </div>
                        );
                      default:
                        return null;
                    }
                  })
                )}
              </div>
            )}

            {/* Attachments Section */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Attachments</h3>
              <AttachmentList applicationId={appId!} />
            </div>

            {/* Submit button at bottom like Google Forms - only show if not before open */}
            {!isBeforeOpen &&
              (appRow.status === "draft" ||
                (appRow.status === "submitted" && isEditing)) && (
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={handleSubmit}
                    className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700"
                    disabled={submitting || !canEdit}
                    title={
                      !canEdit ? "Cannot submit - deadline has passed" : ""
                    }
                  >
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
