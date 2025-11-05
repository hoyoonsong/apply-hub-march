import React from "react";
import ProfileCard from "../profile/ProfileCard";
import { FilePreview } from "../attachments/FilePreview";
import AutoLinkText from "../AutoLinkText";

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
  // Validate that we have schema data, not profile data
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    // Check if this looks like profile data (has profile-specific fields)
    if (
      raw.full_name ||
      raw.email ||
      raw.phone_number ||
      raw.profile_files ||
      raw.resume_file
    ) {
      console.warn(
        "🔍 AnswersViewer - Received profile data instead of schema, returning empty fields"
      );
      return [];
    }
  }

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
        // If empty string, return "--"
        if (value.trim() === "") return "—";
        try {
          const fileInfo = JSON.parse(value);
          if (fileInfo && fileInfo.fileName) {
            return fileInfo.fileName;
          }
        } catch {
          // Not JSON, treat as regular text
        }
      }
      if (typeof value === "object" && value !== null) {
        // If it has fileName, return it
        if (value.fileName) return value.fileName;
        // If it has name or path, return those
        if (value.name || value.path) return value.name ?? value.path;
        // Otherwise, it's not a valid file object
        return "—";
      }
      // For boolean values (true/false) or other non-file types, return "--"
      if (typeof value === "boolean") return "—";
      // If it's a string that doesn't look like JSON, check if it's empty
      if (typeof value === "string" && value.trim() === "") return "—";
      // Last resort: return "--" for any other non-file value
      return "—";
    default:
      if (typeof value === "object" && value !== null) {
        // If it's profile data, don't show it
        if (value.__source === "profile") return "—";
        // If it's a file object, show the filename
        if (value.fileName) return value.fileName;
        // If it has a name or label, use that
        if (value.name || value.label) return value.name ?? value.label;
        // For any other object, show a clean summary instead of raw JSON
        if (value.full_name) return value.full_name;
        if (value.email) return value.email;
        if (value.phone_number) return value.phone_number;
        // Last resort: show a clean message instead of raw JSON
        return "—";
      }
      return String(value);
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
  if (field.id in answers) {
    const value = answers[field.id];
    // Check if this is profile data being returned as a field value
    if (
      field.id === "profile" &&
      value &&
      typeof value === "object" &&
      value.__source === "profile"
    ) {
      console.warn(
        "🔍 AnswersViewer - Field 'profile' is returning profile data instead of a field answer"
      );
      return undefined; // Don't render profile data as a field
    }
    return value;
  }

  // 2) other raw keys
  const candidates = [field.key, field.name].filter(Boolean) as string[];
  for (const c of candidates) {
    if (c in answers) {
      const value = (answers as any)[c];
      // Check if this is profile data being returned as a field value
      if (
        c === "profile" &&
        value &&
        typeof value === "object" &&
        value.__source === "profile"
      ) {
        console.warn(
          "🔍 AnswersViewer - Field key 'profile' is returning profile data instead of a field answer"
        );
        return undefined; // Don't render profile data as a field
      }
      return value;
    }
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
  program,
}: {
  applicationSchema: any;
  answers: Record<string, any>;
  program?: any;
}) {
  const fields = React.useMemo(
    () => normalizeSchema(applicationSchema),
    [applicationSchema]
  );

  // Use the applicant's profile data that was saved when they submitted their application
  // This is the correct profile data to display to reviewers
  const profileForReview = answers?.profile;

  return (
    <div className="space-y-6">
      {/* Profile Autofill Section */}
      {profileForReview && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-blue-900">
              Applicant Profile (Autofilled)
            </h3>
          </div>
          <p className="text-sm text-blue-700 mb-4">
            This information was automatically filled from the applicant's
            profile.
          </p>
          <ProfileCard
            profile={profileForReview}
            sectionSettings={program?.metadata?.application?.profile?.sections}
          />
        </div>
      )}

      {/* Organization Application Questions Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          <h3 className="text-lg font-semibold text-gray-900">
            Organization Application Questions
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Custom questions created by this organization.
        </p>

        <div className="space-y-4">
          {fields.map((field, idx) => {
            const rawValue = getAnswerForField(field, idx, answers);
            const display = formatValue(rawValue, field);

            // Determine if this is a file field (case-insensitive)
            const isFileField = (field.type || "").toLowerCase() === "file";

            // Try to parse file metadata from the answer value if file field
            let fileInfo: any = null;
            if (isFileField && rawValue) {
              if (typeof rawValue === "string") {
                try {
                  const parsed = JSON.parse(rawValue);
                  if (parsed && parsed.filePath) fileInfo = parsed;
                } catch {}
              } else if (typeof rawValue === "object") {
                if ((rawValue as any).filePath) fileInfo = rawValue;
              }
            }

            return (
              <div
                key={field.id ?? `f-${idx}`}
                className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div className="text-sm font-medium text-gray-600">
                  {field.label}
                </div>
                {!isFileField || !fileInfo ? (
                  <div className="text-base text-gray-900">
                    <AutoLinkText text={display} preserveWhitespace={true} />
                  </div>
                ) : null}
                {isFileField && fileInfo && (
                  <div className="mt-2">
                    <FilePreview fileInfo={fileInfo} />
                  </div>
                )}
              </div>
            );
          })}

          {fields.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-500">
                This application doesn't include custom questions.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
