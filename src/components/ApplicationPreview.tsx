import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { ApplicationFileViewer } from "./attachments/ApplicationFileViewer";
import { SimpleFileUpload } from "./attachments/SimpleFileUpload";
import { getBuilderSchema } from "../data/api";
import { Program } from "../lib/programs";

interface Field {
  id: string;
  type: "short_text" | "long_text" | "date" | "select" | "checkbox" | "file";
  label: string;
  required?: boolean;
  options?: string[];
  maxLength?: number;
}

interface ApplicationPreviewProps {
  fields?: Field[];
  program?: Program;
  isOpen: boolean;
  onClose: () => void;
  alwaysOpen?: boolean; // For super admin preview where it's always visible
}

export default function ApplicationPreview({
  fields: propFields,
  program,
  isOpen,
  onClose,
  alwaysOpen = false,
}: ApplicationPreviewProps) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [fields, setFields] = useState<Field[]>(propFields || []);
  const [loading, setLoading] = useState(false);

  // Load fields from program if provided
  useEffect(() => {
    if (program && !propFields) {
      loadFieldsFromProgram();
    } else if (propFields) {
      setFields(propFields);
    }
  }, [program, propFields]);

  const loadFieldsFromProgram = async () => {
    if (!program) return;

    setLoading(true);
    try {
      // First check if there are pending changes to show
      const meta = program.metadata || {};
      const hasPendingChanges =
        meta.review_status === "pending_changes" ||
        meta.review_status === "submitted";
      const pendingSchema = meta.pending_schema;

      console.log("Preview - program metadata:", meta);
      console.log("Preview - hasPendingChanges:", hasPendingChanges);
      console.log("Preview - pendingSchema:", pendingSchema);

      if (hasPendingChanges && pendingSchema) {
        // Show pending changes for super admin review
        console.log("Showing pending changes in preview:", pendingSchema);
        setFields(pendingSchema.fields || []);
      } else {
        // Show live schema
        const { data: schemaData, error: schemaError } = await supabase
          .from("programs_public")
          .select("application_schema")
          .eq("id", program.id)
          .single();

        if (!schemaError && schemaData) {
          const schema = schemaData.application_schema;
          setFields(schema?.fields || []);
        } else {
          // Fallback to RPC call
          const schema = await getBuilderSchema(program.id);
          setFields(schema.fields || []);
        }
      }
    } catch (e) {
      console.error("Failed to load fields:", e);
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen && !alwaysOpen) return null;

  const setVal = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const renderField = (field: Field, index: number) => {
    const val = answers[field.id];

    switch (field.type) {
      case "short_text":
        return (
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && " *"}
            </label>
            <input
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              value={val ?? ""}
              onChange={(e) => setVal(field.id, e.target.value)}
            />
          </div>
        );
      case "long_text":
        return (
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && " *"}
            </label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              value={val ?? ""}
              onChange={(e) => setVal(field.id, e.target.value)}
            />
          </div>
        );
      case "date":
        return (
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && " *"}
            </label>
            <input
              className="rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="date"
              value={val ?? ""}
              onChange={(e) => setVal(field.id, e.target.value)}
            />
          </div>
        );
      case "select":
        return (
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && " *"}
            </label>
            <select
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={val ?? ""}
              onChange={(e) => setVal(field.id, e.target.value)}
            >
              <option value="">Select an option...</option>
              {field.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      case "checkbox":
        return (
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                checked={!!val}
                onChange={(e) => setVal(field.id, e.target.checked)}
              />
              <label className="text-sm font-medium text-gray-700">
                {field.label}
                {field.required && " *"}
              </label>
            </div>
          </div>
        );
      case "file":
        return (
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && " *"}
            </label>
            <SimpleFileUpload
              applicationId="preview"
              fieldId={field.id}
              value={val || ""}
              onChange={(value) => setVal(field.id, value)}
              disabled={true}
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (alwaysOpen) {
    return (
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white border rounded-lg p-6">
            <p className="text-gray-500 text-center py-8">
              Loading application fields...
            </p>
          </div>
        ) : fields.length === 0 ? (
          <div className="bg-white border rounded-lg p-6">
            <p className="text-gray-500 text-center py-8">
              No fields added yet. Add some fields to see the preview.
            </p>
          </div>
        ) : (
          fields.map((field, index) => (
            <div key={field.id || index}>{renderField(field, index)}</div>
          ))
        )}

        {/* File Attachments Section */}
        <div className="mt-6 pt-4 border-t">
          <h3 className="text-lg font-semibold mb-4">File Attachments</h3>
          <ApplicationFileViewer applicationAnswers={answers} />
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                // In a real preview, this would submit the form
                alert(
                  "This is just a preview - form submission is not functional"
                );
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Submit Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Application Preview</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {loading ? (
              <div className="bg-white border rounded-lg p-6">
                <p className="text-gray-500 text-center py-8">
                  Loading application fields...
                </p>
              </div>
            ) : fields.length === 0 ? (
              <div className="bg-white border rounded-lg p-6">
                <p className="text-gray-500 text-center py-8">
                  No fields added yet. Add some fields to see the preview.
                </p>
              </div>
            ) : (
              fields.map((field, index) => (
                <div key={field.id || index}>{renderField(field, index)}</div>
              ))
            )}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  // In a real preview, this would submit the form
                  alert(
                    "This is just a preview - form submission is not functional"
                  );
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Submit Application
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
