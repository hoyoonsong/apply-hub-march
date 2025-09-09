import type { ApplicationSchema, Answers } from "@/types/application";

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
    case "LONG_TEXT":
      return "";
    case "DATE":
      return null; // ISO string or null
    case "SELECT":
      return null; // selected option
    case "CHECKBOX":
      return false;
    case "FILE":
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
    const empty =
      v === null ||
      v === undefined ||
      (typeof v === "string" && v.trim() === "") ||
      (Array.isArray(v) && v.length === 0);
    if (empty) missing.push(f.label || f.key);
  }
  return missing;
}
