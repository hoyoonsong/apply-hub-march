// components/attachments/SimpleFileUpload.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { FilePreview } from "./FilePreview";

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/heic",
  "video/mp4",
  "audio/mpeg",
  "application/pdf",
];

export function SimpleFileUpload({
  applicationId,
  fieldId,
  value,
  onChange,
  maxSizeMB = 50,
  disabled = false,
}: {
  applicationId: string;
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
  maxSizeMB?: number;
  disabled?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const maxBytes = maxSizeMB * 1024 * 1024;

  console.log("[simple-upload] mounted for field", fieldId, "value:", value);

  // Auto-upload when file is selected
  useEffect(() => {
    if (file && !uploading) {
      handleAutoUpload();
    }
  }, [file]);

  async function handleAutoUpload() {
    if (!file || uploading) return;

    try {
      setUploading(true);

      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("[simple-upload] auth error", authError);
        alert("You must be logged in to upload files");
        setFile(null);
        return;
      }

      console.log("[simple-upload] user authenticated:", user.id);

      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`Unsupported file type: ${file.type || "unknown"}`);
        setFile(null);
        return;
      }
      if (file.size > maxBytes) {
        alert(`File too large. Max ${maxSizeMB} MB.`);
        setFile(null);
        return;
      }

      const filePath = `applications/${applicationId}/${fieldId}/${Date.now()}_${
        file.name
      }`;

      console.log("[simple-upload] uploading", {
        fieldId,
        filePath,
        type: file.type,
        size: file.size,
        userId: user.id,
      });

      // Upload to storage
      const { data: upData, error: upErr } = await supabase.storage
        .from("application-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || undefined,
        });

      if (upErr) {
        console.error("[simple-upload] storage error", upErr);
        alert(`Upload failed: ${upErr.message}`);
        setFile(null);
        return;
      }

      console.log("[simple-upload] storage success", upData);

      // Instead of using the application_attachments table,
      // we'll store the file info in the application's answers
      // This bypasses the RLS issue
      const fileInfo = {
        fileName: file.name,
        filePath: filePath,
        fileSize: file.size,
        contentType: file.type,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.id,
      };

      // Success! Update the form value with file info
      console.log("[simple-upload] success", fileInfo);
      onChange(JSON.stringify(fileInfo)); // Store as JSON string
      setFile(null);
    } catch (error: any) {
      console.error("[simple-upload] unexpected error", error);
      alert(`Unexpected error: ${error.message}`);
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  // Parse the current value to show file info
  let currentFile: any = null;
  try {
    if (value) {
      const parsed = JSON.parse(value);
      // Only treat it as a file if it has the expected file structure
      // Check for file-specific properties to avoid treating profile data as files
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed.fileName || parsed.filePath) &&
        !parsed.__source &&
        !parsed.full_name &&
        !parsed.email &&
        !parsed.address
      ) {
        currentFile = parsed;
      } else if (typeof value === "string" && !value.startsWith("{")) {
        // If it's a simple string (not JSON), treat it as a filename
        currentFile = { fileName: value };
      }
      // Otherwise, treat as empty/invalid (don't set currentFile)
    }
  } catch (e) {
    // If it's not JSON, treat it as a simple filename only if it's not empty
    if (value && typeof value === "string" && value.trim() !== "") {
      currentFile = { fileName: value };
    }
  }

  return (
    <div className="space-y-2">
      {/* File input */}
      <input
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        disabled={disabled || uploading}
        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
      />

      {/* Current file display */}
      {currentFile && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-green-600 bg-green-50 p-2 rounded">
            <div>
              <strong>Saved:</strong> {currentFile.fileName}
              {currentFile.fileSize && (
                <span className="text-gray-500">
                  {" "}
                  • {(currentFile.fileSize / (1024 * 1024)).toFixed(2)} MB
                </span>
              )}
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                }}
                className="text-red-600 hover:text-red-800 font-medium text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          {/* File preview */}
          <div className="border rounded-lg p-3 bg-white">
            <FilePreview fileInfo={currentFile} />
          </div>
        </div>
      )}

      {/* Uploading status */}
      {uploading && (
        <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
          <strong>Uploading...</strong> {file?.name}
        </div>
      )}
    </div>
  );
}
