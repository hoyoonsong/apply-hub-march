import type { ApplicationSchema, Answers } from "../types/application";

export function reconcileAnswers(
  schema: ApplicationSchema,
  current: Answers | null | undefined
): Answers {
  const safe: Answers = {};
  const src = current || {};
  for (const f of schema.fields) {
    if (src.hasOwnProperty(f.key)) safe[f.key] = src[f.key];
    else safe[f.key] = defaultValueForField(f.type);
  }
  return safe;
}

function defaultValueForField(type: string) {
  switch (type) {
    case "SHORT_TEXT":
    case "short_text":
    case "LONG_TEXT":
    case "long_text":
      return "";
    case "DATE":
    case "date":
      return null; // ISO string or null
    case "SELECT":
    case "select":
      return null; // selected option
    case "CHECKBOX":
    case "checkbox":
      return false;
    case "FILE":
    case "file":
      return null; // you can store file URL or storage path
    default:
      return null;
  }
}

export function missingRequired(
  schema: ApplicationSchema,
  answers: Answers
): string[] {
  const missing: string[] = [];
  for (const f of schema.fields) {
    if (!f.required) continue;
    const v = answers[f.key];
    const typeUpper = String(f.type).toUpperCase();
    const isCheckbox = typeUpper === "CHECKBOX";
    // Normalize checkbox-like string values that might come back from older drafts
    const vNormalized = (() => {
      if (!isCheckbox) return v;
      if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
        if (s === "false" || s === "0" || s === "no" || s === "off" || s === "")
          return false;
      }
      return v;
    })();
    const empty =
      vNormalized === null ||
      vNormalized === undefined ||
      (typeof vNormalized === "string" && vNormalized.trim() === "") ||
      (Array.isArray(vNormalized) && vNormalized.length === 0) ||
      // For required checkboxes, only a strict true counts as filled
      (isCheckbox && vNormalized !== true);
    if (empty) missing.push(f.label || f.key);
  }
  return missing;
}
