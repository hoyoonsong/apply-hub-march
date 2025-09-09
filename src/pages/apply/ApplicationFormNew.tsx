"use client";

import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getApplication, saveApplication } from "../../lib/rpc";

type Field = {
  id: string;
  kind: "short_text" | "long_text" | "date" | "select" | "checkbox" | "file";
  label: string;
  required?: boolean;
  options?: string[];
  maxLength?: number;
};

function normalizeSchema(schema: any): Field[] {
  // Be tolerant of various shapes; expect builder to store array under application_schema.fields or directly as array
  if (!schema) return [];
  if (Array.isArray(schema)) return schema as Field[];
  if (Array.isArray(schema?.fields)) return schema.fields as Field[];
  return [];
}

export default function ApplicationFormNew() {
  const params = useParams();
  const applicationId = useMemo(() => (params?.id as string) || "", [params]);

  const [row, setRow] = useState<AppRow | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!applicationId) return;
      const data = await getApplication(applicationId);
      if (!mounted) return;
      setRow(data);
      const f = normalizeSchema(data.application_schema);
      setFields(f);
      setAnswers(data.answers ?? {});
    })();
    return () => {
      mounted = false;
    };
  }, [applicationId]);

  async function onSave() {
    if (!applicationId) return;
    setSaving(true);
    try {
      const updated = await saveApplication(applicationId, answers);
      setRow((r) => (r ? { ...r, ...updated } : (updated as any)));
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit() {
    if (!applicationId) return;
    setSaving(true);
    try {
      const updated = await saveApplication(applicationId, answers);
      setRow((r) => (r ? { ...r, ...updated } : (updated as any)));
      // Optional: navigate away or show toast
    } finally {
      setSaving(false);
    }
  }

  if (!applicationId) return <div className="p-6">Loading…</div>;
  if (!row) return <div className="p-6">Loading application…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded bg-gray-200 px-3 py-1"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onSubmit}
          disabled={saving}
          className="rounded bg-blue-600 px-3 py-1 text-white"
        >
          {saving ? "Submitting…" : "Submit"}
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="text-sm text-gray-500 border rounded p-3">
          This application doesn't include custom questions.
        </div>
      ) : (
        <form className="space-y-4">
          {fields.map((f) => (
            <FieldInput
              key={f.id}
              field={f}
              value={answers[f.id]}
              onChange={(v) => setAnswers((a) => ({ ...a, [f.id]: v }))}
            />
          ))}
        </form>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: any;
  onChange: (v: any) => void;
}) {
  const id = field.id;
  const label = field.label || id;

  switch (field.kind) {
    case "short_text":
      return (
        <div className="grid gap-1">
          <label className="text-sm">
            {label}
            {field.required ? " *" : ""}
          </label>
          <input
            className="border rounded px-3 py-2"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "long_text":
      return (
        <div className="grid gap-1">
          <label className="text-sm">
            {label}
            {field.required ? " *" : ""}
          </label>
          <textarea
            className="border rounded px-3 py-2"
            rows={5}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "date":
      return (
        <div className="grid gap-1">
          <label className="text-sm">
            {label}
            {field.required ? " *" : ""}
          </label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "select":
      return (
        <div className="grid gap-1">
          <label className="text-sm">
            {label}
            {field.required ? " *" : ""}
          </label>
          <select
            className="border rounded px-3 py-2"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="" disabled>
              — Select —
            </option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    case "checkbox":
      return (
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>{label}</span>
        </label>
      );
    case "file":
      return (
        <div className="grid gap-1">
          <label className="text-sm">
            {label}
            {field.required ? " *" : ""}
          </label>
          <input
            type="file"
            onChange={(e) => onChange(e.target.files?.[0]?.name ?? null)}
          />
          {value ? (
            <div className="text-xs text-gray-500">
              Selected: {String(value)}
            </div>
          ) : null}
        </div>
      );
    default:
      return (
        <div className="text-xs text-orange-700">
          Unsupported field: {field.kind}
        </div>
      );
  }
}
