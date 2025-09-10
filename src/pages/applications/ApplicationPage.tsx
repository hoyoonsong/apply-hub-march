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
import type { ProgramApplicationSchema } from "../../types/application";
import {
  isPastDeadline,
  isBeforeOpenDate,
  isApplicationOpen,
  getDeadlineMessage,
  getOpenDateMessage,
} from "../../lib/deadlineUtils";

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

    setSubmitting(true);
    try {
      if (appRow.status === "draft") {
        // First time submitting
        await submitApplication(appId, answers);
        localStorage.removeItem(`app:${appId}:answers`);
        alert("Application submitted!");
        navigate("/");
      } else if (appRow.status === "submitted" && isEditing) {
        // Saving changes to already submitted application
        await saveApplication(appId, answers);
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {appRow.program_name ?? "Application"}
        </h1>
        <div className="flex gap-2">
          {/* Show Edit Application button only for submitted apps that can still be edited */}
          {appRow.status === "submitted" && canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
            >
              Edit Application
            </button>
          )}

          {/* Show Cancel button only when editing submitted apps */}
          {isEditing && appRow.status === "submitted" && (
            <button
              onClick={() => setIsEditing(false)}
              className="rounded-md bg-gray-500 px-3 py-2 text-sm text-white"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

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
                ✓ Application submitted - You can still edit until the deadline
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
                          cursor: isFormEditable ? "pointer" : "not-allowed",
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
                          cursor: isFormEditable ? "pointer" : "not-allowed",
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
                      <input
                        type="file"
                        onChange={(e) =>
                          update(key, e.target.files?.[0]?.name ?? "")
                        }
                        disabled={!isFormEditable}
                        className={!isFormEditable ? "opacity-50" : ""}
                        style={{
                          cursor: isFormEditable ? "pointer" : "not-allowed",
                        }}
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

      {/* Submit button at bottom like Google Forms - only show if not before open */}
      {!isBeforeOpen &&
        (appRow.status === "draft" ||
          (appRow.status === "submitted" && isEditing)) && (
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={handleSubmit}
              className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700"
              disabled={submitting || !canEdit}
              title={!canEdit ? "Cannot submit - deadline has passed" : ""}
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        )}
    </div>
  );
}
