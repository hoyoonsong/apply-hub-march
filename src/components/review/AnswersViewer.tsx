import React from "react";
import { FilePreview } from "../attachments/FilePreview";
import ProfileCard from "../profile/ProfileCard";

type RawField = {
  id?: string;
  key?: string;
  name?: string;
  label?: string;
  type?: string;
  required?: boolean;
  options?: string[]; // for select/checkbox groups
  [k: string]: any;
};

type Field = RawField & { id: string; label: string; type: string };

function normalizeSchema(raw: any): Field[] {
  const arr: RawField[] = Array.isArray(raw?.fields)
    ? raw.fields
    : Array.isArray(raw)
    ? raw
    : [];
  return arr.map((f, i) => {
    const id = (f.id ?? f.key ?? f.name ?? `q_${i}`).toString();
    const label = (f.label ?? f.name ?? f.key ?? id).toString();
    const type = (f.type ?? "text").toString();
    return { ...f, id, label, type };
  });
}

function formatValue(value: any, field: Field): string {
  if (value === null || value === undefined || value === "") return "—";

  // simple formatting per field type
  switch (field.type) {
    case "checkbox":
      if (typeof value === "boolean") return value ? "Yes" : "No";
      if (Array.isArray(value)) return value.join(", ");
      return String(value);
    case "select":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "date":
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d.toLocaleDateString();
      } catch {}
      return String(value);
    case "file":
      // Check if this is a file field with metadata
      if (typeof value === "string") {
        try {
          const fileInfo = JSON.parse(value);
          if (fileInfo && fileInfo.fileName) {
            return (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  📎 {fileInfo.fileName} (
                  {(fileInfo.fileSize / (1024 * 1024)).toFixed(2)} MB)
                </div>
                <div className="border rounded-lg p-3 bg-white">
                  <FilePreview fileInfo={fileInfo} />
                </div>
              </div>
            );
          }
        } catch {
          // Not JSON, treat as regular text
        }
      }
      if (typeof value === "object" && value !== null) {
        return value.name ?? value.path ?? JSON.stringify(value);
      }
      return String(value);
    default:
      return typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}

/**
 * Find the applicant's answer for a given field.
 * 1) Try by field.id (normalized from id|key|name)
 * 2) If missing, try by raw key/name
 * 3) Fallback: index-based using q_0, q_1, ... when answers were stored by order
 */
function getAnswerForField(
  field: Field,
  index: number,
  answers: Record<string, any>
) {
  if (!answers || typeof answers !== "object") return undefined;

  // 1) direct id
  if (field.id in answers) return answers[field.id];

  // 2) other raw keys
  const candidates = [field.key, field.name].filter(Boolean) as string[];
  for (const c of candidates) {
    if (c in answers) return (answers as any)[c];
  }

  // 3) fallback by index (q_0, q_1, ...)
  const orderedKeys = Object.keys(answers).sort((a, b) => {
    // try to keep q_10 after q_2
    const ai = a.match(/^q_(\d+)$/)?.[1];
    const bi = b.match(/^q_(\d+)$/)?.[1];
    if (ai && bi) return Number(ai) - Number(bi);
    return a.localeCompare(b);
  });

  if (index < orderedKeys.length) {
    const k = orderedKeys[index];
    return (answers as any)[k];
  }

  return undefined;
}

export default function AnswersViewer({
  applicationSchema,
  answers,
}: {
  applicationSchema: any;
  answers: Record<string, any>;
}) {
  const fields = React.useMemo(
    () => normalizeSchema(applicationSchema),
    [applicationSchema]
  );

  // Check for profile data in answers
  const profileForReview = answers?.profile || answers?.common_app; // legacy read ok

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      {profileForReview && (
        <div className="mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-900">
                Profile Information
              </span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              This information was automatically filled from the applicant's
              profile.
            </p>
          </div>
          <ProfileCard profile={profileForReview} />
        </div>
      )}

      {fields.map((field, idx) => {
        const rawValue = getAnswerForField(field, idx, answers);
        const display = formatValue(rawValue, field);

        return (
          <div key={field.id ?? `f-${idx}`} className="border rounded-md p-3">
            <div className="text-xs uppercase text-gray-500 mb-1">
              {field.label}
            </div>
            <div className="text-sm">{display}</div>
          </div>
        );
      })}

      {fields.length === 0 && (
        <div className="text-sm text-gray-500">
          This application doesn't include custom questions.
        </div>
      )}
    </div>
  );
}
